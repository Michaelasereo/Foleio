export type PlatformPlan = 'STARTER' | 'PRO' | 'PREMIUM';

/** Full access on every plan — billing differentiates on booking fee only. */
const UNLIMITED = {
  maxContent: Number.POSITIVE_INFINITY,
  maxSubscriptionPlans: Number.POSITIVE_INFINITY,
  maxBookingsPerMonth: Number.POSITIVE_INFINITY,
  canCreateCollections: true,
  hasAnalytics: true,
  hasBranding: false,
} as const;

export const PLAN_LIMITS = {
  STARTER: UNLIMITED,
  PRO: UNLIMITED,
  PREMIUM: UNLIMITED,
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
      'You have reached the content upload limit for your plan. Contact support if this looks wrong.',
    feature: 'Unlimited content uploads',
  },
  maxSubscriptionPlans: {
    title: 'Subscription plan limit reached',
    description: (_plan: string) =>
      'You have reached the subscription plan limit. Contact support if this looks wrong.',
    feature: 'More subscription plans',
  },
  maxBookingsPerMonth: {
    title: 'Monthly booking limit reached',
    description:
      'You have reached the monthly booking limit. Contact support if this looks wrong.',
    feature: 'Unlimited bookings',
  },
  canCreateCollections: {
    title: 'Collections unavailable',
    description: 'Collections are not available on this account right now.',
    feature: 'Collections & courses',
  },
  hasAnalytics: {
    title: 'Analytics unavailable',
    description: 'Analytics are not available on this account right now.',
    feature: 'Advanced analytics',
  },
} as const;

export type PlanLimitType = keyof typeof PLAN_LIMIT_MESSAGES;
