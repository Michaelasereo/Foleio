import { prisma } from '@foleio/database';
import { getCreatorPlanLimits, type PLAN_LIMITS } from '@/lib/utils/plan-limits';

type Limits = (typeof PLAN_LIMITS)[keyof typeof PLAN_LIMITS];

function hasCreatorId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

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
 *
 * Never throws on a missing creator id — returns Free limits instead of
 * crashing public/dashboard SSR (Prisma unique-where requires a real id).
 */
export async function getEffectiveCreatorPlanLimits(creator: {
  id?: string | null;
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
}): Promise<Limits> {
  let subscriptionStatus: string | null = null;

  if (hasCreatorId(creator.id)) {
    try {
      const subscription = await prisma.platformSubscription.findUnique({
        where: { creatorId: creator.id },
        select: { status: true },
      });
      subscriptionStatus = subscription?.status ?? null;
    } catch (error) {
      console.error('[getEffectiveCreatorPlanLimits] subscription lookup failed', {
        creatorId: creator.id,
        error,
      });
    }
  } else {
    console.warn(
      '[getEffectiveCreatorPlanLimits] missing creator.id — treating as Free'
    );
  }

  const platformSubscriptionActive = resolveCreatorPaidActive({
    platformSubscriptionActive: creator.platformSubscriptionActive,
    subscriptionStatus,
  });

  return getCreatorPlanLimits({
    platformPlan: creator.platformPlan,
    platformSubscriptionActive,
  });
}

/**
 * Load cancel-safe paid-active for server pages that pass props into client gates.
 * Missing / empty creatorId → false (Free), never a Prisma throw.
 */
export async function getCreatorPaidActiveForId(
  creatorId: string | null | undefined,
  platformSubscriptionActive?: boolean | null
): Promise<boolean> {
  if (!hasCreatorId(creatorId)) {
    console.warn(
      '[getCreatorPaidActiveForId] missing creatorId — treating as Free'
    );
    return false;
  }

  try {
    const subscription = await prisma.platformSubscription.findUnique({
      where: { creatorId },
      select: { status: true },
    });
    return resolveCreatorPaidActive({
      platformSubscriptionActive,
      subscriptionStatus: subscription?.status,
    });
  } catch (error) {
    console.error('[getCreatorPaidActiveForId] subscription lookup failed', {
      creatorId,
      error,
    });
    return false;
  }
}
