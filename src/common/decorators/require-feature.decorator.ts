import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from '@/config/tier.config';

export const REQUIRE_FEATURE_KEY = 'requireFeature';
export const RequireFeature = (feature: FeatureKey) =>
  SetMetadata(REQUIRE_FEATURE_KEY, feature);
