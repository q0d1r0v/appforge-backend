import { SetMetadata } from '@nestjs/common';
import { SubscriptionTier } from '@prisma/client';

export const REQUIRE_TIER_KEY = 'requireTier';
export const RequireTier = (...tiers: SubscriptionTier[]) =>
  SetMetadata(REQUIRE_TIER_KEY, tiers);
