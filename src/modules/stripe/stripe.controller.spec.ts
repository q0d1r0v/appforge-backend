import { Test, TestingModule } from '@nestjs/testing';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

describe('StripeController', () => {
  let controller: StripeController;

  const mockStripeService = {
    createCheckoutSession: jest.fn(),
    handleWebhook: jest.fn(),
    cancelSubscription: jest.fn(),
    getSubscriptionStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [{ provide: StripeService, useValue: mockStripeService }],
    }).compile();

    controller = module.get<StripeController>(StripeController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createCheckout', () => {
    it('should call createCheckoutSession with userId', async () => {
      const expected = { url: 'https://checkout.stripe.com/s-1', sessionId: 's-1' };
      mockStripeService.createCheckoutSession.mockResolvedValue(expected);

      const result = await controller.createCheckout('user-1');

      expect(result).toEqual(expected);
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith('user-1');
    });
  });

  describe('handleWebhook', () => {
    it('should call handleWebhook with payload and signature', async () => {
      const payload = Buffer.from('raw-body');
      const signature = 'whsec_test';
      mockStripeService.handleWebhook.mockResolvedValue({ received: true });

      const result = await controller.handleWebhook(payload, signature);

      expect(result).toEqual({ received: true });
      expect(mockStripeService.handleWebhook).toHaveBeenCalledWith(payload, signature);
    });
  });

  describe('cancelSubscription', () => {
    it('should call cancelSubscription with userId', async () => {
      const expected = { message: 'Subscription will be canceled at end of billing period' };
      mockStripeService.cancelSubscription.mockResolvedValue(expected);

      const result = await controller.cancelSubscription('user-1');

      expect(result).toEqual(expected);
      expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getStatus', () => {
    it('should call getSubscriptionStatus with userId', async () => {
      const expected = { status: 'ACTIVE', priceId: 'price_123' };
      mockStripeService.getSubscriptionStatus.mockResolvedValue(expected);

      const result = await controller.getStatus('user-1');

      expect(result).toEqual(expected);
      expect(mockStripeService.getSubscriptionStatus).toHaveBeenCalledWith('user-1');
    });
  });
});
