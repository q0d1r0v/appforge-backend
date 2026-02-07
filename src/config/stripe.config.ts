import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  successUrl:
    process.env.STRIPE_SUCCESS_URL ||
    'http://localhost:5173/billing/success',
  failUrl:
    process.env.STRIPE_FAIL_URL || 'http://localhost:5173/billing/cancel',
  subscriptionPriceId: process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
  prices: {
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    pro: process.env.STRIPE_PRO_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  },
  tokenPackPriceId: process.env.STRIPE_TOKEN_PACK_PRICE_ID,
}));
