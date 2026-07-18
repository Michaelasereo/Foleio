export type PlatformPlan = 'STARTER' | 'PRO' | 'GROWTH';

const FREE_LIMITS = {
  maxContent: Number.POSITIVE_INFINITY,
  maxSubscriptionPlans: Number.POSITIVE_INFINITY,
  maxBookingsPerMonth: Number.POSITIVE_INFINITY,
  maxServices: 10,
  maxProducts: 10,
  maxPreorderProducts: 5,
  canCreateCollections: true,
  canUseAvailabilityTemplates: false,
  hasAnalytics: true,
  hasBranding: false,
} as const;

const PAID_LIMITS = {
  maxContent: Number.POSITIVE_INFINITY,
  maxSubscriptionPlans: Number.POSITIVE_INFINITY,
  maxBookingsPerMonth: Number.POSITIVE_INFINITY,
  maxServices: Number.POSITIVE_INFINITY,
  maxProducts: Number.POSITIVE_INFINITY,
  maxPreorderProducts: Number.POSITIVE_INFINITY,
  canCreateCollections: true,
  canUseAvailabilityTemplates: true,
  hasAnalytics: true,
  hasBranding: false,
} as const;

export const PLAN_LIMITS = {
  STARTER: FREE_LIMITS,
  PRO: PAID_LIMITS,
  GROWTH: PAID_LIMITS,
  /** @deprecated Use GROWTH */
  PREMIUM: PAID_LIMITS,
} as const;

export function getCreatorPlan(platformPlan: string | null): PlatformPlan {
  const normalized = (platformPlan || '').toUpperCase();
  if (normalized === 'PRO') return 'PRO';
  if (normalized === 'GROWTH' || normalized === 'PREMIUM') return 'GROWTH';
  return 'STARTER';
}

/**
 * Active Pro/Growth (or legacy PREMIUM) subscription — Free caps otherwise.
 */
export function isPaidPlanActive(creator: {
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
}): boolean {
  if (!creator.platformSubscriptionActive) return false;
  const plan = getCreatorPlan(creator.platformPlan ?? null);
  return plan === 'PRO' || plan === 'GROWTH';
}

/**
 * Effective limits for gating. When `platformSubscriptionActive` is provided,
 * inactive paid plans use Free (STARTER) caps.
 */
export function getPlanLimits(
  platformPlan: string | null,
  platformSubscriptionActive?: boolean | null
) {
  if (platformSubscriptionActive === false) {
    return PLAN_LIMITS.STARTER;
  }

  if (platformSubscriptionActive === true) {
    const plan = getCreatorPlan(platformPlan);
    return plan === 'STARTER' ? PLAN_LIMITS.STARTER : PLAN_LIMITS[plan];
  }

  return PLAN_LIMITS[getCreatorPlan(platformPlan)];
}

/** Convenience: limits from a creator row with plan + subscription fields. */
export function getCreatorPlanLimits(creator: {
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
}) {
  return getPlanLimits(
    creator.platformPlan ?? null,
    Boolean(creator.platformSubscriptionActive)
  );
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
    feature: 'Subscription plans',
  },
  maxBookingsPerMonth: {
    title: 'Booking limit reached',
    description:
      'You have reached the booking limit for your plan. Contact support if this looks wrong.',
    feature: 'Bookings',
  },
  maxServices: {
    title: 'Service limit reached',
    description:
      'Free includes up to 10 services. Upgrade to Pro for unlimited services.',
    feature: 'Unlimited services',
  },
  maxProducts: {
    title: 'Product limit reached',
    description:
      'Free includes up to 10 products. Upgrade to Pro for unlimited products.',
    feature: 'Unlimited products',
  },
  maxPreorderProducts: {
    title: 'Preorder limit reached',
    description:
      'Free includes up to 5 preorder products. Upgrade to Pro for unlimited preorders.',
    feature: 'Unlimited preorder products',
  },
  availabilityTemplates: {
    title: 'Schedule templates are Pro',
    description:
      'Save and reuse availability templates on Pro. You can still set availability day by day on Free.',
    feature: 'Availability schedule templates',
  },
} as const;
