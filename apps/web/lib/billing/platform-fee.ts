import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';
import {
  feePercentForCreator,
  toFeePlanInput,
  type FeePlanInput,
} from '@/lib/billing/platform-fee-calc';

export {
  defaultPlatformFeePercent,
  PLATFORM_SUB_FEE_SELECT,
  toFeePlanInput,
  feePercentForCreator,
  platformFeeFromGross,
  paystackTransactionChargeKobo,
  type FeePlanInput,
  type PlatformFeeSplit,
} from '@/lib/billing/platform-fee-calc';

function readPaystackPercentageCharge(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const raw = (data as { percentage_charge?: unknown }).percentage_charge;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Push the creator's current platform fee % to their Paystack subaccount.
 * Loads subscription row so legacy Pro 0% is detected correctly.
 * Verifies the live Paystack value after update (dashboard Split ≈ 100 − fee%).
 */
export async function syncCreatorSubaccountFee(creatorId: string): Promise<{
  updated: boolean;
  percentageCharge: number;
  previousPercentageCharge: number | null;
  verifiedPercentageCharge: number | null;
}> {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      paystackSubaccountCode: true,
      platformPlan: true,
      platformSubscriptionActive: true,
      platformSubscriptions: {
        where: {
          status: { in: ['active', 'trialing', 'cancelled', 'canceled'] },
        },
        orderBy: [{ createdAt: 'desc' }],
        select: {
          plan: true,
          amount: true,
          status: true,
          currentPeriodEnd: true,
        },
        take: 5,
      },
    },
  });

  const activeSub =
    creator?.platformSubscriptions?.find((sub) =>
      ['active', 'trialing'].includes(String(sub.status || '').toLowerCase())
    ) || creator?.platformSubscriptions?.[0];

  const feeInput: FeePlanInput = toFeePlanInput({
    platformPlan: creator?.platformPlan,
    platformSubscriptionActive: creator?.platformSubscriptionActive,
    platformSubscriptions: activeSub ? [activeSub] : [],
  });

  const percentageCharge = feePercentForCreator(feeInput);

  if (!creator?.paystackSubaccountCode) {
    return {
      updated: false,
      percentageCharge,
      previousPercentageCharge: null,
      verifiedPercentageCharge: null,
    };
  }

  const before = await paystack.getSubaccount(creator.paystackSubaccountCode);
  const previousPercentageCharge = readPaystackPercentageCharge(before);

  await paystack.updateSubaccount({
    subaccount_code: creator.paystackSubaccountCode,
    percentage_charge: percentageCharge,
  });

  const after = await paystack.getSubaccount(creator.paystackSubaccountCode);
  const verifiedPercentageCharge = readPaystackPercentageCharge(after);

  if (
    verifiedPercentageCharge != null &&
    Math.abs(verifiedPercentageCharge - percentageCharge) > 0.01
  ) {
    throw new Error(
      `Paystack still shows ${verifiedPercentageCharge}% after sync (wanted ${percentageCharge}%)`
    );
  }

  return {
    updated: true,
    percentageCharge,
    previousPercentageCharge,
    verifiedPercentageCharge,
  };
}
