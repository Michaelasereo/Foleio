import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';

/** Default Foleio cut on Free (STARTER). Overridable via env. */
export function defaultPlatformFeePercent(): number {
  const raw = Number(process.env.FOLEIO_PLATFORM_FEE_PERCENT ?? '5');
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) return 5;
  return raw;
}

/** Amounts below this (kobo) use a flat platform fee instead of %. */
export const SMALL_ORDER_THRESHOLD_KOBO = 500_000; // ₦5,000

/** Flat Foleio fee for small orders (kobo). */
export const SMALL_ORDER_FLAT_FEE_KOBO = 30_000; // ₦300

export type FeePlanInput = {
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
};

export type PlatformFeeSplit = {
  platformFee: number;
  creatorEarnings: number;
  feePct: number;
  feeType: 'none' | 'flat' | 'percent';
};

/**
 * Free/STARTER → default (5%).
 * Active PRO/PREMIUM platform subscription → 0% Foleio fee.
 */
export function feePercentForCreator(creator: FeePlanInput): number {
  const plan = (creator.platformPlan || '').toUpperCase();
  const paidPlan = plan === 'PRO' || plan === 'PREMIUM';
  if (creator.platformSubscriptionActive && paidPlan) {
    return 0;
  }
  return defaultPlatformFeePercent();
}

/**
 * Foleio platform cut from a gross charge (kobo).
 * - Pro / 0% plan → no fee
 * - Under ₦5,000 → flat ₦300 (capped at the charge amount)
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

  if (amount < SMALL_ORDER_THRESHOLD_KOBO) {
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
 * No-op if they have not linked a bank/subaccount yet.
 * Note: per-charge flat fees for small orders are applied via transaction_charge
 * at initialize time, not on the subaccount itself.
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
    },
  });

  if (!creator?.paystackSubaccountCode) {
    return {
      updated: false,
      percentageCharge: feePercentForCreator(creator || {}),
    };
  }

  const percentageCharge = feePercentForCreator(creator);

  await paystack.updateSubaccount({
    subaccount_code: creator.paystackSubaccountCode,
    percentage_charge: percentageCharge,
  });

  return { updated: true, percentageCharge };
}
