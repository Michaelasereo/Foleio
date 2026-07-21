import { prisma } from '@foleio/database';
import { getCreatorPlanLimits, type PLAN_LIMITS } from '@/lib/utils/plan-limits';

type Limits = (typeof PLAN_LIMITS)[keyof typeof PLAN_LIMITS];

export function isPaidSubscriptionStatus(status?: string | null): boolean {
  const normalized = (status || '').toLowerCase();
  return normalized === 'active' || normalized === 'trialing';
}

/**
 * Cancel-safe Pro flag: creator row active AND subscription status active/trialing.
 * Prevents Free Billing + Pro feature unlock when flags and sub row disagree.
 */
export function resolveCreatorPaidActive(input: {
  platformSubscriptionActive?: boolean | null;
  subscriptionStatus?: string | null;
}): boolean {
  return (
    Boolean(input.platformSubscriptionActive) &&
    isPaidSubscriptionStatus(input.subscriptionStatus)
  );
}

/**
 * Pro feature access for API routes.
 * Requires an active/trialing platform subscription — cancelled rows cannot
 * keep Pro unlocked when Billing already shows Free.
 */
export async function getEffectiveCreatorPlanLimits(creator: {
  id: string;
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
}): Promise<Limits> {
  const subscription = await prisma.platformSubscription.findUnique({
    where: { creatorId: creator.id },
    select: { status: true },
  });

  const platformSubscriptionActive = resolveCreatorPaidActive({
    platformSubscriptionActive: creator.platformSubscriptionActive,
    subscriptionStatus: subscription?.status,
  });

  return getCreatorPlanLimits({
    platformPlan: creator.platformPlan,
    platformSubscriptionActive,
  });
}

/** Load cancel-safe paid-active for server pages that pass props into client gates. */
export async function getCreatorPaidActiveForId(
  creatorId: string,
  platformSubscriptionActive?: boolean | null
): Promise<boolean> {
  const subscription = await prisma.platformSubscription.findUnique({
    where: { creatorId },
    select: { status: true },
  });
  return resolveCreatorPaidActive({
    platformSubscriptionActive,
    subscriptionStatus: subscription?.status,
  });
}
