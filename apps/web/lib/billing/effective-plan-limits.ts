import { prisma } from '@foleio/database';
import { getCreatorPlanLimits, type PLAN_LIMITS } from '@/lib/utils/plan-limits';

type Limits = (typeof PLAN_LIMITS)[keyof typeof PLAN_LIMITS];

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

  const status = (subscription?.status || '').toLowerCase();
  const subscriptionPaid = status === 'active' || status === 'trialing';
  const platformSubscriptionActive =
    subscriptionPaid && Boolean(creator.platformSubscriptionActive);

  return getCreatorPlanLimits({
    platformPlan: creator.platformPlan,
    platformSubscriptionActive,
  });
}
