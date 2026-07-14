import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';

/** Default Foleio cut on Free (STARTER). Overridable via env. */
export function defaultPlatformFeePercent(): number {
  const raw = Number(process.env.FOLEIO_PLATFORM_FEE_PERCENT ?? '5');
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) return 5;
  return raw;
}

export type FeePlanInput = {
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
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
 * Push the creator's current platform fee % to their Paystack subaccount.
 * No-op if they have not linked a bank/subaccount yet.
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
