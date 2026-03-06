export type PlatformPlan = 'STARTER' | 'PRO' | 'PREMIUM';

export const PLAN_LIMITS = {
  STARTER: {
    maxContent: 5,
    maxSubscriptionPlans: 1,
    maxBookingsPerMonth: 10,
    canCreateCollections: false,
    hasAnalytics: false,
    hasBranding: true,
  },
  PRO: {
    maxContent: Number.POSITIVE_INFINITY,
    maxSubscriptionPlans: 3,
    maxBookingsPerMonth: Number.POSITIVE_INFINITY,
    canCreateCollections: true,
    hasAnalytics: true,
    hasBranding: false,
  },
  PREMIUM: {
    maxContent: Number.POSITIVE_INFINITY,
    maxSubscriptionPlans: Number.POSITIVE_INFINITY,
    maxBookingsPerMonth: Number.POSITIVE_INFINITY,
    canCreateCollections: true,
    hasAnalytics: true,
    hasBranding: false,
  },
} as const;

export function getCreatorPlan(platformPlan: string | null): PlatformPlan {
  const normalized = (platformPlan || '').toUpperCase();
  if (normalized === 'PRO') return 'PRO';
  if (normalized === 'PREMIUM') return 'PREMIUM';
  return 'STARTER';
}

export function getPlanLimits(platformPlan: string | null) {
  return PLAN_LIMITS[getCreatorPlan(platformPlan)];
}

export const PLAN_LIMIT_MESSAGES = {
  maxContent: {
    title: 'Content limit reached',
    description:
      'Starter creators can upload up to 5 pieces of content. Upgrade to Pro for unlimited uploads.',
    feature: 'Unlimited content uploads',
  },
  maxSubscriptionPlans: {
    title: 'Subscription plan limit reached',
    description: (plan: string) =>
      plan === 'STARTER'
        ? 'Starter creators can create 1 fan subscription plan. Upgrade to Pro for up to 3 plans.'
        : 'Pro creators can create up to 3 fan subscription plans. Upgrade to Premium for unlimited plans.',
    feature: 'More subscription plans',
  },
  maxBookingsPerMonth: {
    title: 'Monthly booking limit reached',
    description:
      'Starter creators can receive up to 10 bookings per month. Upgrade to Pro for unlimited bookings.',
    feature: 'Unlimited bookings',
  },
  canCreateCollections: {
    title: 'Collections are a Pro feature',
    description:
      'Organize your content into courses and collections with a Pro or Premium plan.',
    feature: 'Collections & courses',
  },
  hasAnalytics: {
    title: 'Analytics are a Pro feature',
    description:
      'Get detailed insights on your content performance, subscriber growth, and revenue with Pro.',
    feature: 'Advanced analytics',
  },
} as const;

export type PlanLimitType = keyof typeof PLAN_LIMIT_MESSAGES;
