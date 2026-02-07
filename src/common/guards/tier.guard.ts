import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionTier } from '@prisma/client';
import { REQUIRE_TIER_KEY } from '@/common/decorators/require-tier.decorator';
import { REQUIRE_FEATURE_KEY } from '@/common/decorators/require-feature.decorator';
import { getTierConfig, FeatureKey } from '@/config/tier.config';

@Injectable()
export class TierGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTiers = this.reflector.getAllAndOverride<SubscriptionTier[]>(
      REQUIRE_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredFeature = this.reflector.getAllAndOverride<FeatureKey>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTiers && !requiredFeature) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (requiredTiers && requiredTiers.length > 0) {
      if (!requiredTiers.includes(user.tier)) {
        throw new ForbiddenException(
          `This action requires one of the following subscription tiers: ${requiredTiers.join(', ')}. Your current tier is ${user.tier}.`,
        );
      }
    }

    if (requiredFeature) {
      const tierConfig = getTierConfig(user.tier);
      if (!tierConfig.features[requiredFeature]) {
        throw new ForbiddenException(
          `The "${requiredFeature}" feature is not available on your current ${tierConfig.displayName} plan. Please upgrade to access this feature.`,
        );
      }
    }

    return true;
  }
}
