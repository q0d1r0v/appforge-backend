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
import { getTierForPriceId, getPriceIdForTier } from '@/config/stripe-prices.config';
import { EventsGateway } from '@/modules/events/events.gateway';

/** Tier ordering for upgrade/downgrade detection */
const TIER_ORDER: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 0,
  [SubscriptionTier.STARTER]: 1,
  [SubscriptionTier.PRO]: 2,
  [SubscriptionTier.ENTERPRISE]: 3,
};

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly webhookSecret: string;
  private readonly successUrl: string;
  private readonly failUrl: string;
  private readonly defaultPriceId: string;
  private readonly tokenPackPriceId: string;

  constructor(
    @Inject(STRIPE_CLIENT) private stripe: Stripe,
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventsGateway: EventsGateway,
  ) {
    this.webhookSecret =
      this.configService.get<string>('stripe.webhookSecret')!;
    this.successUrl = this.configService.get<string>('stripe.successUrl')!;
    this.failUrl = this.configService.get<string>('stripe.failUrl')!;
    this.defaultPriceId =
      this.configService.get<string>('stripe.subscriptionPriceId')!;
    this.tokenPackPriceId =
      this.configService.get<string>('stripe.tokenPackPriceId')!;
  }

  async createCheckoutSession(
    userId: string,
    priceId?: string,
    tier?: SubscriptionTier,
  ) {
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

    // Resolve price ID: explicit priceId > tier-based > default
    let resolvedPriceId = priceId;
    if (!resolvedPriceId && tier) {
      resolvedPriceId = getPriceIdForTier(tier) || undefined;
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      currency: 'usd',
      payment_method_types: ['card'],
      line_items: [
        {
          price: resolvedPriceId || this.defaultPriceId,
          quantity: 1,
        },
      ],
      success_url: `${this.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: this.failUrl,
      metadata: { userId },
    });

    return { url: session.url, sessionId: session.id };
  }

  async createTierCheckout(userId: string, tier: SubscriptionTier) {
    if (tier === SubscriptionTier.FREE) {
      throw new BadRequestException('Cannot create checkout for FREE tier');
    }

    const priceId = getPriceIdForTier(tier);
    if (!priceId) {
      throw new BadRequestException(
        `No price configured for tier: ${tier}`,
      );
    }

    return this.createCheckoutSession(userId, priceId);
  }

  async changeTier(userId: string, newTier: SubscriptionTier) {
    if (newTier === SubscriptionTier.FREE) {
      throw new BadRequestException(
        'Cannot change to FREE tier. Use cancel subscription instead.',
      );
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) {
      throw new BadRequestException('No active subscription');
    }

    const newPriceId = getPriceIdForTier(newTier);
    if (!newPriceId) {
      throw new BadRequestException(
        `No price configured for tier: ${newTier}`,
      );
    }

    // Retrieve the current Stripe subscription to get the item ID
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );
    const currentItemId = stripeSubscription.items.data[0].id;

    // Update the subscription item's price (Stripe prorates automatically)
    const updatedSubscription = await this.stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: currentItemId,
            price: newPriceId,
          },
        ],
      },
    );

    // Update local subscription record
    await this.prisma.subscription.update({
      where: { userId },
      data: {
        priceId: newPriceId,
        tier: newTier,
      },
    });

    // Update user tier
    await this.prisma.user.update({
      where: { id: userId },
      data: { tier: newTier },
    });

    const effectiveDate = new Date(
      updatedSubscription.items.data[0].current_period_start * 1000,
    );

    return {
      message: `Subscription changed to ${newTier}`,
      effectiveDate,
    };
  }

  async purchaseTokenPack(userId: string, quantity: number) {
    if (!this.tokenPackPriceId) {
      throw new BadRequestException('Token pack price not configured');
    }

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
      mode: 'payment',
      currency: 'usd',
      payment_method_types: ['card'],
      line_items: [
        {
          price: this.tokenPackPriceId,
          quantity,
        },
      ],
      success_url: `${this.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: this.failUrl,
      metadata: { userId, type: 'token_pack', quantity: String(quantity) },
    });

    return { url: session.url, sessionId: session.id };
  }

  async createPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!user.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found for this user');
    }

    const portalSession =
      await this.stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: this.successUrl,
      });

    return { url: portalSession.url };
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
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
      case 'invoice.finalized':
        await this.handleInvoiceEvent(
          event.data.object as Stripe.Invoice,
          event.type,
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
      tier: subscription.tier,
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

    // Resolve tier from the subscription's price ID
    const tier = getTierForPriceId(item.price.id);
    const resolvedTier =
      tier === SubscriptionTier.FREE ? SubscriptionTier.PRO : tier;

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeSubscriptionId: subscriptionId,
        status: SubscriptionStatus.ACTIVE,
        priceId: item.price.id,
        tier: resolvedTier,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      update: {
        stripeSubscriptionId: subscriptionId,
        status: SubscriptionStatus.ACTIVE,
        priceId: item.price.id,
        tier: resolvedTier,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        canceledAt: null,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { tier: resolvedTier },
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

    // Resolve tier from the subscription's price ID
    const subItem = subscription.items.data[0];
    const resolvedTier = getTierForPriceId(subItem.price.id);

    const tier: SubscriptionTier =
      status === SubscriptionStatus.ACTIVE ||
      status === SubscriptionStatus.TRIALING
        ? resolvedTier === SubscriptionTier.FREE
          ? SubscriptionTier.PRO // fallback for unrecognized price IDs
          : resolvedTier
        : SubscriptionTier.FREE;

    // Detect downgrade
    const oldTier = dbSub.tier;
    const isDowngrade = TIER_ORDER[tier] < TIER_ORDER[oldTier];

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status,
        priceId: subItem.price.id,
        tier,
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

    // Send downgrade notification via WebSocket
    if (isDowngrade) {
      this.eventsGateway.emitNotification(dbSub.userId, {
        type: 'subscription:downgraded',
        title: 'Subscription Downgraded',
        message: `Your subscription has been changed from ${oldTier} to ${tier}`,
        metadata: { oldTier, newTier: tier },
      });
    }
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

  private async handleInvoiceEvent(
    invoice: Stripe.Invoice,
    eventType: string,
  ) {
    this.logger.log(
      `Processing invoice event: ${eventType} for invoice ${invoice.id}`,
    );

    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

    // Find the user associated with this Stripe customer
    let userId: string | null = null;
    if (customerId) {
      const user = await this.prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
        select: { id: true },
      });
      userId = user?.id || null;
    }

    const lineItems = invoice.lines?.data?.map((line) => {
      const priceRef = line.pricing?.price_details?.price;
      const priceId =
        typeof priceRef === 'string' ? priceRef : priceRef?.id || null;
      return {
        description: line.description,
        amount: line.amount,
        currency: line.currency,
        quantity: line.quantity,
        priceId,
      };
    });

    const paymentIntentId =
      (invoice as any).payment_intent?.id ||
      (typeof (invoice as any).payment_intent === 'string'
        ? (invoice as any).payment_intent
        : null);

    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        userId,
        stripeInvoiceId: invoice.id,
        stripePaymentIntent: paymentIntentId,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status || 'draft',
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        invoiceUrl: invoice.hosted_invoice_url || null,
        invoicePdf: invoice.invoice_pdf || null,
        lineItems: lineItems || null,
      },
      update: {
        stripePaymentIntent: paymentIntentId,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        status: invoice.status || 'draft',
        invoiceUrl: invoice.hosted_invoice_url || null,
        invoicePdf: invoice.invoice_pdf || null,
        lineItems: lineItems || null,
      },
    });
  }
}
