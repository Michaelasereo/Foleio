export type PlatformPlan = 'STARTER' | 'PRO' | 'GROWTH';

const FREE_LIMITS = {
  maxContent: Number.POSITIVE_INFINITY,
  maxSubscriptionPlans: Number.POSITIVE_INFINITY,
  maxBookingsPerMonth: Number.POSITIVE_INFINITY,
  maxServices: 10,
  maxProducts: 10,
  maxPreorderProducts: 5,
  maxProductImages: 3,
  maxReviews: 0,
  maxPortfolioCategories: 0,
  canCreateCollections: true,
  canUseAvailabilityTemplates: false,
  canSellDigitalProducts: false,
  canSellGiftCards: false,
  canUseCoupons: false,
  canUseConditionalDelivery: false,
  canAppearInDiscover: false,
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
  maxProductImages: 5,
  maxReviews: 10,
  maxPortfolioCategories: 3,
  canCreateCollections: true,
  canUseAvailabilityTemplates: true,
  canSellDigitalProducts: true,
  canSellGiftCards: true,
  canUseCoupons: true,
  canUseConditionalDelivery: true,
  canAppearInDiscover: true,
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
 * Effective limits for gating.
 * Pro/Growth ONLY when `platformSubscriptionActive === true` and plan is paid.
 * Missing/undefined active must not unlock Pro from a stale `platformPlan` string
 * (e.g. Billing shows Free after cancel but creator.platformPlan was left as pro).
 */
export function getPlanLimits(
  platformPlan: string | null,
  platformSubscriptionActive?: boolean | null
) {
  if (platformSubscriptionActive !== true) {
    return PLAN_LIMITS.STARTER;
  }

  const plan = getCreatorPlan(platformPlan);
  return plan === 'STARTER' ? PLAN_LIMITS.STARTER : PLAN_LIMITS[plan];
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
  maxProductImages: {
    title: 'Product photo limit reached',
    description:
      'Free includes up to 3 product photos. Upgrade to Pro for up to 5 photos per product.',
    feature: 'Up to 5 product photos',
  },
  maxReviews: {
    title: 'Customer reviews are Pro',
    description:
      'Add up to 10 customer testimonials on your public page with Pro.',
    feature: 'Up to 10 customer reviews',
  },
  conditionalDelivery: {
    title: 'Conditional delivery is Pro',
    description:
      'Offer free delivery when customers spend a minimum or buy enough items — on Pro.',
    feature: 'Conditional free delivery',
  },
  giftCards: {
    title: 'Gift cards are Pro',
    description:
      'Sell creator gift cards with reusable balances on Pro.',
    feature: 'Shop gift cards',
  },
  coupons: {
    title: 'Coupons are Pro',
    description:
      'Create percent or fixed-amount coupon codes for your shop on Pro.',
    feature: 'Shop coupon codes',
  },
  availabilityTemplates: {
    title: 'Schedule templates are Pro',
    description:
      'Save and reuse availability templates on Pro. You can still set availability day by day on Free.',
    feature: 'Availability schedule templates',
  },
  maxPortfolioCategories: {
    title: 'Portfolio categories are Pro',
    description:
      'Free includes one Home gallery. Upgrade to Pro for up to 3 named portfolio categories.',
    feature: 'Up to 3 portfolio categories',
  },
  digitalProducts: {
    title: 'Digital products are Pro',
    description:
      'Sell PDF downloads from your shop on Pro. Physical products stay available on Free.',
    feature: 'Digital product downloads',
  },
  appearInDiscover: {
    title: 'Top Creators is Pro',
    description:
      'Appear on Top Creators and get listed for Google search on Pro. Your public link still works on Free.',
    feature: 'Appear on Top Creators & Google',
  },
} as const;
