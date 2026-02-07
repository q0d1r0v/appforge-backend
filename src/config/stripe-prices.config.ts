import { SubscriptionTier } from '@prisma/client';

export function getTierForPriceId(priceId: string): SubscriptionTier {
  const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const enterprisePriceId = process.env.STRIPE_ENTERPRISE_PRICE_ID;

  if (priceId === starterPriceId) return SubscriptionTier.STARTER;
  if (priceId === proPriceId) return SubscriptionTier.PRO;
  if (priceId === enterprisePriceId) return SubscriptionTier.ENTERPRISE;

  return SubscriptionTier.FREE;
}

export function getPriceIdForTier(tier: SubscriptionTier): string | null {
  switch (tier) {
    case SubscriptionTier.STARTER:
      return process.env.STRIPE_STARTER_PRICE_ID || null;
    case SubscriptionTier.PRO:
      return process.env.STRIPE_PRO_PRICE_ID || null;
    case SubscriptionTier.ENTERPRISE:
      return process.env.STRIPE_ENTERPRISE_PRICE_ID || null;
    default:
      return null;
  }
}
