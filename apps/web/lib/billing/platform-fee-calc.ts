/**
 * Pure platform fee math — safe for client components.
 * Do not import prisma/paystack here.
 */
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
  feeType: 'none' | 'percent';
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
 * Free / Pro / Growth → 3.5% (pure percent).
 * Legacy monthly Pro → 0% until period end.
 * Inactive paid → Free default (3.5%).
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
 * - Otherwise → feePct of gross (Free / Pro / Growth are all 3.5%)
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
 * Standard Free/Pro/Growth use subaccount % only — no override.
 */
export function paystackTransactionChargeKobo(
  _grossKobo: number,
  _creator: FeePlanInput
): number | undefined {
  return undefined;
}
