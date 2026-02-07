import { SubscriptionTier } from '@prisma/client';

export interface TierFeatures {
  codeGeneration: boolean;
  advancedEstimates: boolean;
  customTemplates: boolean;
  exportProject: boolean;
  prioritySupport: boolean;
  organizationBilling: boolean;
}

export interface TierLimits {
  monthlyTokenQuota: number;
  maxProjects: number;
  dailyAiRequests: number;
  features: TierFeatures;
  rateLimit: {
    requestsPerMinute: number;
    aiRequestsPerMinute: number;
  };
  displayName: string;
  monthlyPrice: number;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    monthlyTokenQuota: 50_000,
    maxProjects: 3,
    dailyAiRequests: 10,
    features: {
      codeGeneration: false,
      advancedEstimates: false,
      customTemplates: false,
      exportProject: true,
      prioritySupport: false,
      organizationBilling: false,
    },
    rateLimit: {
      requestsPerMinute: 30,
      aiRequestsPerMinute: 5,
    },
    displayName: 'Free',
    monthlyPrice: 0,
  },
  [SubscriptionTier.STARTER]: {
    monthlyTokenQuota: 200_000,
    maxProjects: 10,
    dailyAiRequests: 50,
    features: {
      codeGeneration: false,
      advancedEstimates: true,
      customTemplates: true,
      exportProject: true,
      prioritySupport: false,
      organizationBilling: false,
    },
    rateLimit: {
      requestsPerMinute: 60,
      aiRequestsPerMinute: 10,
    },
    displayName: 'Starter',
    monthlyPrice: 19,
  },
  [SubscriptionTier.PRO]: {
    monthlyTokenQuota: 1_000_000,
    maxProjects: 50,
    dailyAiRequests: 200,
    features: {
      codeGeneration: true,
      advancedEstimates: true,
      customTemplates: true,
      exportProject: true,
      prioritySupport: true,
      organizationBilling: true,
    },
    rateLimit: {
      requestsPerMinute: 120,
      aiRequestsPerMinute: 20,
    },
    displayName: 'Pro',
    monthlyPrice: 49,
  },
  [SubscriptionTier.ENTERPRISE]: {
    monthlyTokenQuota: Infinity,
    maxProjects: Infinity,
    dailyAiRequests: Infinity,
    features: {
      codeGeneration: true,
      advancedEstimates: true,
      customTemplates: true,
      exportProject: true,
      prioritySupport: true,
      organizationBilling: true,
    },
    rateLimit: {
      requestsPerMinute: 300,
      aiRequestsPerMinute: 60,
    },
    displayName: 'Enterprise',
    monthlyPrice: 199,
  },
};

export type FeatureKey = keyof TierFeatures;

export function getTierConfig(tier: SubscriptionTier): TierLimits {
  return TIER_CONFIG[tier];
}
