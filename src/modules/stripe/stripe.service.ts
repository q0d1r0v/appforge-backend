import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '@/prisma/prisma.service';
import { STRIPE_CLIENT } from './stripe.constants';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly webhookSecret: string;
  private readonly successUrl: string;
  private readonly failUrl: string;
  private readonly defaultPriceId: string;

  constructor(
    @Inject(STRIPE_CLIENT) private stripe: Stripe,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.webhookSecret =
      this.configService.get<string>('stripe.webhookSecret')!;
    this.successUrl = this.configService.get<string>('stripe.successUrl')!;
    this.failUrl = this.configService.get<string>('stripe.failUrl')!;
    this.defaultPriceId =
      this.configService.get<string>('stripe.subscriptionPriceId')!;
  }

  async createCheckoutSession(userId: string, priceId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      customerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId || this.defaultPriceId,
          quantity: 1,
        },
      ],
      success_url: `${this.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: this.failUrl,
      metadata: { userId },
    });

    return { url: session.url, sessionId: session.id };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err);
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription)
      throw new NotFoundException('No active subscription found');

    await this.stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    return {
      message: 'Subscription will be canceled at end of billing period',
    };
  }

  async getSubscriptionStatus(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return { status: 'none', tier: 'FREE' };
    }

    return {
      status: subscription.status,
      priceId: subscription.priceId,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      canceledAt: subscription.canceledAt,
    };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const subscriptionId = session.subscription as string;
    const userId = session.metadata?.userId;
    if (!userId || !subscriptionId) return;

    const stripeSubscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);

    const item = stripeSubscription.items.data[0];
    const periodStart = new Date(item.current_period_start * 1000);
    const periodEnd = new Date(item.current_period_end * 1000);

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeSubscriptionId: subscriptionId,
        status: SubscriptionStatus.ACTIVE,
        priceId: item.price.id,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      update: {
        stripeSubscriptionId: subscriptionId,
        status: SubscriptionStatus.ACTIVE,
        priceId: item.price.id,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        canceledAt: null,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { tier: SubscriptionTier.PRO },
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const dbSub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!dbSub) return;

    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      trialing: SubscriptionStatus.TRIALING,
    };

    const status = statusMap[subscription.status] || SubscriptionStatus.ACTIVE;
    const tier: SubscriptionTier =
      status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING
        ? SubscriptionTier.PRO
        : SubscriptionTier.FREE;

    const subItem = subscription.items.data[0];
    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status,
        currentPeriodStart: new Date(subItem.current_period_start * 1000),
        currentPeriodEnd: new Date(subItem.current_period_end * 1000),
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      },
    });

    await this.prisma.user.update({
      where: { id: dbSub.userId },
      data: { tier },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const dbSub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!dbSub) return;

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: dbSub.userId },
      data: { tier: SubscriptionTier.FREE },
    });
  }
}
