import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';
import { syncCreatorSubaccountFee } from '@/lib/billing/platform-fee';
import {
  type BillingInterval,
  type PaidPlatformPlan,
  PLATFORM_PLAN_AMOUNTS_KOBO,
  amountForPlan,
  intervalFromAmount,
  periodEndFromInterval,
} from '@/lib/billing/platform-plans';

export type ActivatePlatformSubscriptionInput = {
  creatorId: string;
  plan?: string | null;
  amountKobo?: number | null;
  billingInterval?: BillingInterval | string | null;
  subscriptionCode?: string | null;
  emailToken?: string | null;
};

function resolvePaidPlan(plan: string): PaidPlatformPlan {
  const normalized = plan.toLowerCase();
  if (normalized === 'growth' || normalized === 'premium') return 'growth';
  return 'pro';
}

function resolveInterval(
  plan: PaidPlatformPlan,
  interval: string | null | undefined,
  amountKobo: number
): BillingInterval {
  if (interval === 'annual' || interval === 'biannual') return interval;
  return intervalFromAmount(plan, amountKobo);
}

/**
 * Mark a creator's platform subscription active and sync Paystack fee %.
 * Idempotent — safe to call from webhook and callback verify.
 */
export async function activatePlatformSubscription(
  input: ActivatePlatformSubscriptionInput
) {
  if (!input.creatorId) {
    throw new Error('creatorId is required');
  }

  const paidPlan = resolvePaidPlan(String(input.plan || 'pro'));
  const amount =
    input.amountKobo && input.amountKobo > 0
      ? input.amountKobo
      : amountForPlan(paidPlan, 'biannual');
  const billingInterval = resolveInterval(
    paidPlan,
    input.billingInterval,
    amount
  );
  const now = new Date();
  const periodEnd = periodEndFromInterval(billingInterval, now);

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
      plan: paidPlan,
      status: 'active',
      amount,
      billingInterval,
      ...(subscriptionCode ? { paystackSubscriptionId: subscriptionCode } : {}),
      ...(emailToken ? { paystackEmailToken: emailToken } : {}),
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
    create: {
      creatorId: input.creatorId,
      plan: paidPlan,
      status: 'active',
      amount,
      billingInterval,
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
      platformPlan: paidPlan.toUpperCase(),
      platformSubscriptionEndsAt: periodEnd,
    },
  });

  try {
    await syncCreatorSubaccountFee(input.creatorId);
  } catch (feeErr) {
    console.error(
      '[activatePlatformSubscription] failed to sync platform fee',
      feeErr
    );
  }

  return { plan: paidPlan, billingInterval, periodEnd, amount };
}

export { PLATFORM_PLAN_AMOUNTS_KOBO };
