import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { PrismaService } from '@/prisma/prisma.service';
import { STRIPE_CLIENT } from './stripe.constants';

describe('StripeService', () => {
  let service: StripeService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    stripeCustomerId: null as string | null,
  };

  const mockSubscription = {
    userId: 'user-1',
    stripeSubscriptionId: 'sub_123',
    status: 'ACTIVE',
    priceId: 'price_default',
    currentPeriodStart: new Date('2025-01-01'),
    currentPeriodEnd: new Date('2025-02-01'),
    canceledAt: null,
  };

  const mockStripe = {
    customers: {
      create: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    subscriptions: {
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'stripe.webhookSecret': 'whsec_test_secret',
        'stripe.successUrl': 'https://example.com/success',
        'stripe.failUrl': 'https://example.com/cancel',
        'stripe.subscriptionPriceId': 'price_default',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: STRIPE_CLIENT, useValue: mockStripe },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createCheckoutSession', () => {
    it('should create a checkout session for user with existing stripeCustomerId', async () => {
      const userWithCustomer = { ...mockUser, stripeCustomerId: 'cus_existing' };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithCustomer);
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_123',
        id: 'cs_123',
      });

      const result = await service.createCheckoutSession('user-1');

      expect(result).toEqual({
        url: 'https://checkout.stripe.com/session_123',
        sessionId: 'cs_123',
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_existing',
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: 'price_default', quantity: 1 }],
        success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://example.com/cancel',
        metadata: { userId: 'user-1' },
      });
    });

    it('should create a Stripe customer when user has no stripeCustomerId', async () => {
      const userWithoutCustomer = { ...mockUser, stripeCustomerId: null };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutCustomer);
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' });
      mockPrismaService.user.update.mockResolvedValue({
        ...userWithoutCustomer,
        stripeCustomerId: 'cus_new',
      });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_456',
        id: 'cs_456',
      });

      const result = await service.createCheckoutSession('user-1', 'price_custom');

      expect(result).toEqual({
        url: 'https://checkout.stripe.com/session_456',
        sessionId: 'cs_456',
      });
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: { userId: 'user-1' },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { stripeCustomerId: 'cus_new' },
      });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_new',
          line_items: [{ price: 'price_custom', quantity: 1 }],
        }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createCheckoutSession('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    const payload = Buffer.from('test-payload');
    const signature = 'test-signature';

    it('should throw BadRequestException when signature verification fails', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(service.handleWebhook(payload, signature)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle checkout.session.completed event', async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        subscription: 'sub_new',
        metadata: { userId: 'user-1' },
      };
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: mockSession },
      });
      mockStripe.subscriptions.retrieve.mockResolvedValue({
        items: {
          data: [
            {
              current_period_start: 1704067200,
              current_period_end: 1706745600,
              price: { id: 'price_default' },
            },
          ],
        },
      });
      mockPrismaService.subscription.upsert.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.handleWebhook(payload, signature);

      expect(result).toEqual({ received: true });
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_new');
      expect(mockPrismaService.subscription.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: {
          userId: 'user-1',
          stripeSubscriptionId: 'sub_new',
          status: 'ACTIVE',
          priceId: 'price_default',
          currentPeriodStart: new Date(1704067200 * 1000),
          currentPeriodEnd: new Date(1706745600 * 1000),
        },
        update: {
          stripeSubscriptionId: 'sub_new',
          status: 'ACTIVE',
          priceId: 'price_default',
          currentPeriodStart: new Date(1704067200 * 1000),
          currentPeriodEnd: new Date(1706745600 * 1000),
          canceledAt: null,
        },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tier: 'PRO' },
      });
    });

    it('should handle customer.subscription.updated event', async () => {
      const mockStripeSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        status: 'active',
        canceled_at: null,
        items: {
          data: [
            {
              current_period_start: 1704067200,
              current_period_end: 1706745600,
              price: { id: 'price_default' },
            },
          ],
        } as any,
      };
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: { object: mockStripeSubscription },
      });
      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.subscription.update.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.handleWebhook(payload, signature);

      expect(result).toEqual({ received: true });
      expect(mockPrismaService.subscription.findUnique).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
      });
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: new Date(1704067200 * 1000),
          currentPeriodEnd: new Date(1706745600 * 1000),
          canceledAt: null,
        },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tier: 'PRO' },
      });
    });

    it('should handle customer.subscription.deleted event', async () => {
      const mockStripeSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
      };
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: mockStripeSubscription },
      });
      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.subscription.update.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.handleWebhook(payload, signature);

      expect(result).toEqual({ received: true });
      expect(mockPrismaService.subscription.findUnique).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
      });
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
        data: {
          status: 'CANCELED',
          canceledAt: expect.any(Date),
        },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tier: 'FREE' },
      });
    });

    it('should return received true for unhandled event types', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: { object: {} },
      });

      const result = await service.handleWebhook(payload, signature);

      expect(result).toEqual({ received: true });
    });
  });

  describe('cancelSubscription', () => {
    it('should throw NotFoundException when no subscription exists', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(null);

      await expect(service.cancelSubscription('user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockStripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it('should cancel subscription at end of billing period', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockStripe.subscriptions.update.mockResolvedValue({});

      const result = await service.cancelSubscription('user-1');

      expect(result).toEqual({
        message: 'Subscription will be canceled at end of billing period',
      });
      expect(mockPrismaService.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return FREE status when no subscription exists', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getSubscriptionStatus('user-1');

      expect(result).toEqual({ status: 'none', tier: 'FREE' });
    });

    it('should return subscription details when subscription exists', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.getSubscriptionStatus('user-1');

      expect(result).toEqual({
        status: 'ACTIVE',
        priceId: 'price_default',
        currentPeriodStart: new Date('2025-01-01'),
        currentPeriodEnd: new Date('2025-02-01'),
        canceledAt: null,
      });
    });
  });
});
