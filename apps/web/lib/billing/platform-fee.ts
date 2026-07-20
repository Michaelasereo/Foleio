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
