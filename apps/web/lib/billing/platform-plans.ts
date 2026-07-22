/** Central Foleio platform subscription plans (Free / Pro). Growth hidden from checkout. */

export type BillingInterval = 'monthly' | 'quarterly';
/** `growth` kept for DB / legacy rows; new checkouts are Pro only. */
export type PaidPlatformPlan = 'pro' | 'growth';
export type PlatformPlanSlug = 'starter' | 'free' | PaidPlatformPlan | 'premium';

/** Old monthly Pro amount (₦10,000) — grandfathered at 0% until period end. */
export const LEGACY_PRO_MONTHLY_KOBO = 1_000_000;

export const PLATFORM_PLAN_AMOUNTS_KOBO = {
  pro: {
    monthly: 300_000, // ₦3,000 / month
    quarterly: 750_000, // ₦7,500 / quarter (₦2,500/mo)
  },
} as const;

/** Display-only “was” prices for Pro discount copy (not charged). */
export const PLATFORM_PLAN_COMPARE_AT_KOBO = {
  pro: {
    quarterly: 900_000, // ₦9,000 = ₦3,000 × 3
  },
} as const;

export const PLATFORM_FEE_PERCENT = {
  free: 3.5,
  pro: 1.8,
  /** Existing Growth subscribers only — not offered for new checkout. */
  growth: 3.5,
  /** Legacy monthly Pro until currentPeriodEnd */
  legacyPro: 0,
} as const;

/** Flat ₦100 stacked on Free and Pro % fees (kobo). */
export const PLATFORM_FEE_FLAT_KOBO = {
  free: 10_000,
  pro: 10_000,
} as const;

export function formatFreeFeeLabel(): string {
  const flatNaira = PLATFORM_FEE_FLAT_KOBO.free / 100;
  return `${PLATFORM_FEE_PERCENT.free}% + ₦${flatNaira.toLocaleString('en-NG')}`;
}

export function formatProFeeLabel(): string {
  const flatNaira = PLATFORM_FEE_FLAT_KOBO.pro / 100;
  return `${PLATFORM_FEE_PERCENT.pro}% + ₦${flatNaira.toLocaleString('en-NG')}`;
}

/** Alias for Pro fee label (shared display helpers). */
export function formatPlatformFeeLabel(): string {
  return formatProFeeLabel();
}

export function normalizePlatformPlan(
  plan: string | null | undefined
): 'STARTER' | 'PRO' | 'GROWTH' {
  const normalized = (plan || '').toUpperCase();
  if (normalized === 'PRO') return 'PRO';
  if (normalized === 'GROWTH' || normalized === 'PREMIUM') return 'GROWTH';
  return 'STARTER';
}

export function isPaidPlatformPlan(plan: string | null | undefined): boolean {
  const n = normalizePlatformPlan(plan);
  return n === 'PRO' || n === 'GROWTH';
}

export function amountForPlan(
  plan: PaidPlatformPlan,
  interval: BillingInterval
): number {
  // New checkouts are Pro-only; Growth amounts removed.
  void plan;
  return PLATFORM_PLAN_AMOUNTS_KOBO.pro[interval];
}

export function periodEndFromInterval(
  interval: BillingInterval,
  from: Date = new Date()
): Date {
  const end = new Date(from);
  if (interval === 'quarterly') {
    end.setMonth(end.getMonth() + 3);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

export function intervalFromAmount(
  _plan: PaidPlatformPlan,
  amountKobo: number
): BillingInterval {
  if (amountKobo === PLATFORM_PLAN_AMOUNTS_KOBO.pro.quarterly) return 'quarterly';
  return 'monthly';
}

export function paystackPlanCodeEnvKey(
  plan: PaidPlatformPlan,
  interval: BillingInterval
): string {
  if (plan === 'pro' && interval === 'monthly') return 'PAYSTACK_PRO_MONTHLY_PLAN_CODE';
  if (plan === 'pro' && interval === 'quarterly') {
    return 'PAYSTACK_PRO_QUARTERLY_PLAN_CODE';
  }
  if (interval === 'monthly') return 'PAYSTACK_GROWTH_MONTHLY_PLAN_CODE';
  return 'PAYSTACK_GROWTH_QUARTERLY_PLAN_CODE';
}

/** Strip inline `#` comments / quotes so Netlify/.env values like `PLN_x # note` still work. */
export function sanitizePaystackPlanCode(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const cleaned = raw
    .split('#')[0]
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
  return cleaned || null;
}

export function resolvePaystackPlanCode(
  plan: PaidPlatformPlan,
  interval: BillingInterval
): string | null {
  const key = paystackPlanCodeEnvKey(plan, interval);
  const value = sanitizePaystackPlanCode(process.env[key]);
  if (value) return value;
  if (plan === 'pro') {
    return sanitizePaystackPlanCode(process.env.PAYSTACK_PRO_PLAN_CODE);
  }
  return null;
}

export function formatPlanPrice(amountKobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amountKobo / 100);
}

/**
 * Marketing discount % vs compare-at price (Pro quarterly only).
 */
export function planDiscountPercent(
  plan: PaidPlatformPlan,
  interval: BillingInterval
): number {
  if (plan !== 'pro' || interval !== 'quarterly') return 0;
  const compareAt = PLATFORM_PLAN_COMPARE_AT_KOBO.pro.quarterly;
  const charged = PLATFORM_PLAN_AMOUNTS_KOBO.pro.quarterly;
  if (compareAt <= 0 || charged >= compareAt) return 0;
  return Math.round(((compareAt - charged) / compareAt) * 100);
}

export function planCompareAtKobo(
  plan: PaidPlatformPlan,
  interval: BillingInterval
): number | null {
  if (plan !== 'pro' || interval !== 'quarterly') return null;
  return PLATFORM_PLAN_COMPARE_AT_KOBO.pro.quarterly;
}

/** Free plan bullets for Billing + marketing (fee shown separately where needed). */
export function freePlanFeatureBullets(): string[] {
  return [
    'Public page, bookings, and shop',
    'Up to 10 services and 10 products (5 preorders)',
    'Up to 3 photos per product',
    'One Home portfolio gallery',
    'Paystack payouts to your bank',
  ];
}

/** Pro plan bullets for Billing + marketing (fee shown separately where needed). */
export function proPlanFeatureBullets(): string[] {
  return [
    'Everything on Free',
    'Unlimited services & products',
    'Digital PDF downloads',
    'Gift cards & coupon codes',
    'Conditional free delivery',
    'Up to 5 photos per product',
    'Up to 3 portfolio categories',
    'Up to 10 customer reviews',
    'Availability schedule templates',
    'Appear on Top Creators & Google',
  ];
}

export function isLegacyZeroFeeSubscription(sub: {
  plan?: string | null;
  amount?: number | null;
  status?: string | null;
  currentPeriodEnd?: Date | string | null;
}): boolean {
  const plan = (sub.plan || '').toLowerCase();
  if (plan !== 'pro' && plan !== 'premium') return false;
  if (Number(sub.amount || 0) !== LEGACY_PRO_MONTHLY_KOBO) return false;
  const status = (sub.status || '').toLowerCase();
  if (!['active', 'trialing'].includes(status)) return false;
  if (!sub.currentPeriodEnd) return true;
  const end = new Date(sub.currentPeriodEnd);
  return end.getTime() > Date.now();
}
