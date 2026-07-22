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

/**
 * Default Foleio cut on Free (STARTER).
 * Always uses plan constants — do not override with FOLEIO_PLATFORM_FEE_PERCENT
 * (prod historically had that set to legacy 5%, which kept Paystack Split at 95%).
 */
export function defaultPlatformFeePercent(): number {
  return PLATFORM_FEE_PERCENT.free;
}

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

function preferActivePlatformSubscription(
  rows: Array<NonNullable<FeePlanInput['platformSubscription']>> | null | undefined
): FeePlanInput['platformSubscription'] {
  if (!rows?.length) return null;
  const active = rows.find((s) => {
    const status = String(s?.status || '').toLowerCase();
    return status === 'active' || status === 'trialing';
  });
  return active ?? rows[0] ?? null;
}

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
      preferActivePlatformSubscription(creator.platformSubscriptions) ??
      null,
  };
}

export type PlatformFeeSplit = {
  platformFee: number;
  creatorEarnings: number;
  feePct: number;
  feeType: 'none' | 'percent' | 'percent_plus_flat';
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
 * Free → 3.5% (+ ₦100 flat via platformFeeFromGross).
 * Active Pro → 1.8% (+ ₦100 flat).
 * Active Growth (legacy) → 3.5% percent-only.
 * Legacy monthly Pro → 0% until period end.
 */
export function feePercentForCreator(creator: FeePlanInput): number {
  const subStatus = (creator.platformSubscription?.status || '').toLowerCase();
  if (subStatus && subStatus !== 'active' && subStatus !== 'trialing') {
    return defaultPlatformFeePercent();
  }

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

/** Free and Pro stack ₦100; Growth does not. */
function appliesPercentPlusFlat(creatorOrFeePct: FeePlanInput | number): boolean {
  if (typeof creatorOrFeePct === 'number') {
    return (
      creatorOrFeePct === PLATFORM_FEE_PERCENT.free ||
      creatorOrFeePct === PLATFORM_FEE_PERCENT.pro
    );
  }
  if (isLegacyZeroFee(creatorOrFeePct)) return false;
  if (!creatorOrFeePct.platformSubscriptionActive) return true; // Free
  const plan = normalizePlatformPlan(creatorOrFeePct.platformPlan);
  return plan === 'PRO' || plan === 'STARTER';
}

function flatKoboFor(creatorOrFeePct: FeePlanInput | number): number {
  if (typeof creatorOrFeePct === 'number') {
    if (creatorOrFeePct === PLATFORM_FEE_PERCENT.pro) {
      return PLATFORM_FEE_FLAT_KOBO.pro;
    }
    return PLATFORM_FEE_FLAT_KOBO.free;
  }
  if (
    creatorOrFeePct.platformSubscriptionActive &&
    normalizePlatformPlan(creatorOrFeePct.platformPlan) === 'PRO'
  ) {
    return PLATFORM_FEE_FLAT_KOBO.pro;
  }
  return PLATFORM_FEE_FLAT_KOBO.free;
}

/**
 * Foleio platform cut from a gross charge (kobo).
 * - 0% (legacy) → no fee
 * - Free → 3.5% + ₦100
 * - Pro → 1.8% + ₦100
 * - Growth → 3.5% only
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

  if (appliesPercentPlusFlat(creatorOrFeePct)) {
    const platformFee = Math.min(
      amount,
      Math.round(amount * (feePct / 100)) + flatKoboFor(creatorOrFeePct)
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
 * Used for Free/Pro stacked fee (percent + ₦100).
 */
export function paystackTransactionChargeKobo(
  grossKobo: number,
  creator: FeePlanInput
): number | undefined {
  const split = platformFeeFromGross(grossKobo, creator);
  if (split.feeType === 'percent_plus_flat' && split.platformFee > 0) {
    return split.platformFee;
  }
  return undefined;
}
