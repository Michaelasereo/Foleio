/**
 * Pure platform fee math — safe for client components.
 * Do not import prisma/paystack here.
 */
import {
  LEGACY_PRO_MONTHLY_KOBO,
  PLATFORM_FEE_FLAT_KOBO,
  PLATFORM_FEE_PERCENT,
  normalizePlatformPlan,
} from '@/lib/billing/platform-plans';

/** Default Foleio cut on Free (STARTER). Overridable via env. */
export function defaultPlatformFeePercent(): number {
  const raw = Number(
    process.env.FOLEIO_PLATFORM_FEE_PERCENT ?? String(PLATFORM_FEE_PERCENT.free)
  );
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) return PLATFORM_FEE_PERCENT.free;
  return raw;
}

/** Amounts below this (kobo) use a flat platform fee instead of % — Free only. */
export const SMALL_ORDER_THRESHOLD_KOBO = 500_000; // ₦5,000

/** Flat Foleio fee for small Free-tier orders (kobo). */
export const SMALL_ORDER_FLAT_FEE_KOBO = 30_000; // ₦300

export type FeePlanInput = {
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
  /** When provided, used to detect legacy monthly Pro (0% until period end). */
  platformSubscription?: {
    plan?: string | null;
    amount?: number | null;
    status?: string | null;
    currentPeriodEnd?: Date | string | null;
  } | null;
};

/** Prisma select fragment for legacy fee detection. */
export const PLATFORM_SUB_FEE_SELECT = {
  plan: true,
  amount: true,
  status: true,
  currentPeriodEnd: true,
} as const;

/** Normalize creator + optional subscription relation into FeePlanInput. */
export function toFeePlanInput(creator: {
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
  platformSubscription?: FeePlanInput['platformSubscription'];
  platformSubscriptions?: Array<NonNullable<FeePlanInput['platformSubscription']>> | null;
}): FeePlanInput {
  return {
    platformPlan: creator.platformPlan,
    platformSubscriptionActive: creator.platformSubscriptionActive,
    platformSubscription:
      creator.platformSubscription ??
      creator.platformSubscriptions?.[0] ??
      null,
  };
}

export type PlatformFeeSplit = {
  platformFee: number;
  creatorEarnings: number;
  feePct: number;
  feeType: 'none' | 'flat' | 'percent' | 'percent_plus_flat';
};

function isLegacyZeroFee(creator: FeePlanInput): boolean {
  const sub = creator.platformSubscription;
  if (!sub) return false;
  const plan = (sub.plan || creator.platformPlan || '').toLowerCase();
  if (plan !== 'pro' && plan !== 'premium') return false;
  if (Number(sub.amount || 0) !== LEGACY_PRO_MONTHLY_KOBO) return false;
  const status = (sub.status || '').toLowerCase();
  if (status && !['active', 'trialing', ''].includes(status)) return false;
  if (!creator.platformSubscriptionActive && status !== 'active' && status !== 'trialing') {
    return false;
  }
  if (!sub.currentPeriodEnd) {
    return Boolean(creator.platformSubscriptionActive);
  }
  return new Date(sub.currentPeriodEnd).getTime() > Date.now();
}

/**
 * Free/STARTER → 5%.
 * Active Pro → 3.5% (+ ₦100 flat via platformFeeFromGross).
 * Active Growth (or legacy PREMIUM) → 3.5% (no flat).
 * Legacy monthly Pro → 0% until period end.
 */
export function feePercentForCreator(creator: FeePlanInput): number {
  if (!creator.platformSubscriptionActive) {
    return defaultPlatformFeePercent();
  }

  if (isLegacyZeroFee(creator)) {
    return PLATFORM_FEE_PERCENT.legacyPro;
  }

  const plan = normalizePlatformPlan(creator.platformPlan);
  if (plan === 'GROWTH') return PLATFORM_FEE_PERCENT.growth;
  if (plan === 'PRO') return PLATFORM_FEE_PERCENT.pro;
  return defaultPlatformFeePercent();
}

/** Pro stacks ₦100 on the %; Growth shares the same % and must not. */
function appliesProFlat(creatorOrFeePct: FeePlanInput | number): boolean {
  if (typeof creatorOrFeePct === 'number') {
    // Explicit numeric Pro rate (fee calculator). Growth must pass FeePlanInput.
    return creatorOrFeePct === PLATFORM_FEE_PERCENT.pro;
  }
  if (!creatorOrFeePct.platformSubscriptionActive) return false;
  if (isLegacyZeroFee(creatorOrFeePct)) return false;
  return normalizePlatformPlan(creatorOrFeePct.platformPlan) === 'PRO';
}

/**
 * Foleio platform cut from a gross charge (kobo).
 * - 0% (legacy) → no fee
 * - Free (5%) under ₦5,000 → flat ₦300
 * - Pro → 3.5% of gross + ₦100
 * - Otherwise → feePct of gross (Growth 3.5% with no flat)
 */
export function platformFeeFromGross(
  grossKobo: number,
  creatorOrFeePct: FeePlanInput | number = defaultPlatformFeePercent()
): PlatformFeeSplit {
  const amount = Math.max(0, Math.round(Number(grossKobo) || 0));
  const feePct =
    typeof creatorOrFeePct === 'number'
      ? creatorOrFeePct
      : feePercentForCreator(creatorOrFeePct);

  if (feePct <= 0 || amount <= 0) {
    return {
      platformFee: 0,
      creatorEarnings: amount,
      feePct: Math.max(0, feePct),
      feeType: 'none',
    };
  }

  // Flat small-order fee only on Free (5%) tier.
  if (
    feePct === PLATFORM_FEE_PERCENT.free &&
    amount < SMALL_ORDER_THRESHOLD_KOBO
  ) {
    const platformFee = Math.min(SMALL_ORDER_FLAT_FEE_KOBO, amount);
    return {
      platformFee,
      creatorEarnings: Math.max(0, amount - platformFee),
      feePct,
      feeType: 'flat',
    };
  }

  // Pro: always stack percentage + flat ₦100 (Growth shares % but not flat).
  if (appliesProFlat(creatorOrFeePct)) {
    const platformFee = Math.min(
      amount,
      Math.round(amount * (feePct / 100)) + PLATFORM_FEE_FLAT_KOBO.pro
    );
    return {
      platformFee,
      creatorEarnings: Math.max(0, amount - platformFee),
      feePct,
      feeType: 'percent_plus_flat',
    };
  }

  const platformFee = Math.round(amount * (feePct / 100));
  return {
    platformFee,
    creatorEarnings: Math.max(0, amount - platformFee),
    feePct,
    feeType: 'percent',
  };
}

/**
 * Paystack split overrides for initialize.
 * `transaction_charge` overrides subaccount percentage_charge for that charge.
 * Used for Free flat ₦300 and Pro’s full stacked fee (3.5% + ₦100).
 */
export function paystackTransactionChargeKobo(
  grossKobo: number,
  creator: FeePlanInput
): number | undefined {
  const split = platformFeeFromGross(grossKobo, creator);
  if (
    (split.feeType === 'flat' || split.feeType === 'percent_plus_flat') &&
    split.platformFee > 0
  ) {
    return split.platformFee;
  }
  return undefined;
}
