import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';
import { syncCreatorSubaccountFee } from '@/lib/billing/platform-fee';

const PRO_AMOUNT_KOBO = 1_000_000;

export type ActivatePlatformSubscriptionInput = {
  creatorId: string;
  plan?: string | null;
  amountKobo?: number | null;
  subscriptionCode?: string | null;
  emailToken?: string | null;
};

/**
 * Mark a creator's platform subscription active (Pro) and sync Paystack fee to 0%.
 * Idempotent — safe to call from webhook and callback verify.
 */
export async function activatePlatformSubscription(
  input: ActivatePlatformSubscriptionInput
) {
  if (!input.creatorId) {
    throw new Error('creatorId is required');
  }

  const plan = String(input.plan || 'pro').toLowerCase();
  const amount = input.amountKobo && input.amountKobo > 0 ? input.amountKobo : PRO_AMOUNT_KOBO;
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  let emailToken = input.emailToken ? String(input.emailToken) : null;
  const subscriptionCode = input.subscriptionCode
    ? String(input.subscriptionCode)
    : null;

  if (subscriptionCode && !emailToken) {
    try {
      const fetched = await paystack.fetchSubscription(subscriptionCode);
      emailToken =
        fetched?.data?.email_token || fetched?.data?.emailToken || null;
    } catch (fetchErr) {
      console.error(
        '[activatePlatformSubscription] could not fetch subscription email_token',
        fetchErr
      );
    }
  }

  await prisma.platformSubscription.upsert({
    where: { creatorId: input.creatorId },
    update: {
      plan,
      status: 'active',
      amount,
      ...(subscriptionCode ? { paystackSubscriptionId: subscriptionCode } : {}),
      ...(emailToken ? { paystackEmailToken: emailToken } : {}),
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
    create: {
      creatorId: input.creatorId,
      plan,
      status: 'active',
      amount,
      paystackSubscriptionId: subscriptionCode || undefined,
      paystackEmailToken: emailToken || undefined,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  await prisma.creator.update({
    where: { id: input.creatorId },
    data: {
      platformSubscriptionActive: true,
      platformPlan: plan.toUpperCase(),
    },
  });

  try {
    await syncCreatorSubaccountFee(input.creatorId);
  } catch (feeErr) {
    console.error(
      '[activatePlatformSubscription] failed to sync Pro platform fee',
      feeErr
    );
  }

  return { plan, periodEnd };
}
