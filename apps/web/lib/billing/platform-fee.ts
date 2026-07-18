import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';
import {
  LEGACY_PRO_MONTHLY_KOBO,
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
  feeType: 'none' | 'flat' | 'percent';
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
 * Active Pro → 4% (or 0% legacy monthly Pro until period end).
 * Active Growth (or legacy PREMIUM) → 3.5%.
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

/**
 * Foleio platform cut from a gross charge (kobo).
 * - 0% (legacy) → no fee
 * - Free (5%) under ₦5,000 → flat ₦300
 * - Otherwise → feePct of gross
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
 * Flat small-order fees use `transaction_charge` (kobo) so they override
 * the subaccount's percentage_charge for that charge only.
 */
export function paystackTransactionChargeKobo(
  grossKobo: number,
  creator: FeePlanInput
): number | undefined {
  const split = platformFeeFromGross(grossKobo, creator);
  if (split.feeType === 'flat' && split.platformFee > 0) {
    return split.platformFee;
  }
  return undefined;
}

/**
 * Push the creator's current platform fee % to their Paystack subaccount.
 * Loads subscription row so legacy Pro 0% is detected correctly.
 */
export async function syncCreatorSubaccountFee(creatorId: string): Promise<{
  updated: boolean;
  percentageCharge: number;
}> {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      paystackSubaccountCode: true,
      platformPlan: true,
      platformSubscriptionActive: true,
      platformSubscriptions: {
        select: {
          plan: true,
          amount: true,
          status: true,
          currentPeriodEnd: true,
        },
        take: 1,
      },
    },
  });

  const feeInput: FeePlanInput = toFeePlanInput({
    platformPlan: creator?.platformPlan,
    platformSubscriptionActive: creator?.platformSubscriptionActive,
    platformSubscriptions: creator?.platformSubscriptions,
  });

  if (!creator?.paystackSubaccountCode) {
    return {
      updated: false,
      percentageCharge: feePercentForCreator(feeInput),
    };
  }

  const percentageCharge = feePercentForCreator(feeInput);

  await paystack.updateSubaccount({
    subaccount_code: creator.paystackSubaccountCode,
    percentage_charge: percentageCharge,
  });

  return { updated: true, percentageCharge };
}
