/** Central Foleio platform subscription plans (Free / Pro / Growth). */

export type BillingInterval = 'biannual' | 'annual';
export type PaidPlatformPlan = 'pro' | 'growth';
export type PlatformPlanSlug = 'starter' | 'free' | PaidPlatformPlan | 'premium';

/** Old monthly Pro amount (₦10,000) — grandfathered at 0% until period end. */
export const LEGACY_PRO_MONTHLY_KOBO = 1_000_000;

export const PLATFORM_PLAN_AMOUNTS_KOBO = {
  pro: {
    biannual: 1_200_000, // ₦12,000 / 6 months (charged)
    annual: 2_400_000, // ₦24,000 / year (charged)
  },
  growth: {
    biannual: 3_500_000, // ₦35,000 / 6 months
    annual: 7_000_000, // ₦70,000 / year
  },
} as const;

/** Display-only “was” prices for Pro discount copy (not charged). */
export const PLATFORM_PLAN_COMPARE_AT_KOBO = {
  pro: {
    biannual: 1_400_000, // ₦14,000
    annual: 2_800_000, // ₦28,000
  },
} as const;

export const PLATFORM_FEE_PERCENT = {
  free: 3.5,
  pro: 3.5,
  growth: 3.5,
  /** Legacy monthly Pro until currentPeriodEnd */
  legacyPro: 0,
} as const;

/** Display platform & service fee label (Free / Pro / Growth share 3.5%). */
export function formatPlatformFeeLabel(): string {
  return `${PLATFORM_FEE_PERCENT.pro}%`;
}

/** @deprecated Use formatPlatformFeeLabel — Pro no longer has a flat add-on. */
export function formatProFeeLabel(): string {
  return formatPlatformFeeLabel();
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
  return PLATFORM_PLAN_AMOUNTS_KOBO[plan][interval];
}

export function periodEndFromInterval(
  interval: BillingInterval,
  from: Date = new Date()
): Date {
  const end = new Date(from);
  if (interval === 'annual') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 6);
  }
  return end;
}

export function intervalFromAmount(
  plan: PaidPlatformPlan,
  amountKobo: number
): BillingInterval {
  if (amountKobo === PLATFORM_PLAN_AMOUNTS_KOBO[plan].annual) return 'annual';
  return 'biannual';
}

export function paystackPlanCodeEnvKey(
  plan: PaidPlatformPlan,
  interval: BillingInterval
): string {
  if (plan === 'pro' && interval === 'biannual') return 'PAYSTACK_PRO_6MO_PLAN_CODE';
  if (plan === 'pro' && interval === 'annual') return 'PAYSTACK_PRO_YR_PLAN_CODE';
  if (plan === 'growth' && interval === 'biannual') {
    return 'PAYSTACK_GROWTH_6MO_PLAN_CODE';
  }
  return 'PAYSTACK_GROWTH_YR_PLAN_CODE';
}

export function resolvePaystackPlanCode(
  plan: PaidPlatformPlan,
  interval: BillingInterval
): string | null {
  const key = paystackPlanCodeEnvKey(plan, interval);
  const value = process.env[key]?.trim();
  if (value) return value;
  // Cutover alias: old monthly Pro plan code only for Pro biannual if new env missing
  if (plan === 'pro') {
    return process.env.PAYSTACK_PRO_PLAN_CODE?.trim() || null;
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
 * Marketing discount % vs compare-at price, rounded to a whole number.
 * Pro: charged ₦12k/₦24k vs “was” ₦14k/₦28k → ~14% off.
 */
export function planDiscountPercent(
  plan: PaidPlatformPlan,
  interval: BillingInterval
): number {
  if (plan !== 'pro') return 0;
  const compareAt = PLATFORM_PLAN_COMPARE_AT_KOBO.pro[interval];
  const charged = PLATFORM_PLAN_AMOUNTS_KOBO.pro[interval];
  if (compareAt <= 0 || charged >= compareAt) return 0;
  return Math.round(((compareAt - charged) / compareAt) * 100);
}

export function planCompareAtKobo(
  plan: PaidPlatformPlan,
  interval: BillingInterval
): number | null {
  if (plan !== 'pro') return null;
  return PLATFORM_PLAN_COMPARE_AT_KOBO.pro[interval];
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
