import type { Prisma } from '@prisma/client';
import { isPaidPlanActive } from '@/lib/utils/plan-limits';

const PAID_PLAN_VALUES = ['pro', 'PRO', 'growth', 'GROWTH', 'premium', 'PREMIUM'] as const;

const ACTIVE_SUB_STATUSES = ['active', 'trialing'] as const;

export type DiscoverabilityInput = {
  isPublic?: boolean | null;
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
  /** Platform subscription status when already loaded (e.g. active / cancelled). */
  subscriptionStatus?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

/**
 * Whether a creator should appear on Top Creators and in the public sitemap.
 * Free profiles stay reachable via direct link but are not discoverable.
 */
export function isCreatorDiscoverable(creator: DiscoverabilityInput): boolean {
  if (!creator.isPublic) return false;
  if (!String(creator.displayName || '').trim()) return false;
  if (!String(creator.avatarUrl || '').trim()) return false;

  if (creator.subscriptionStatus != null && creator.subscriptionStatus !== '') {
    const status = creator.subscriptionStatus.toLowerCase();
    if (!(ACTIVE_SUB_STATUSES as readonly string[]).includes(status)) {
      return false;
    }
  }

  return isPaidPlanActive({
    platformPlan: creator.platformPlan,
    platformSubscriptionActive: creator.platformSubscriptionActive,
  });
}

/**
 * Prisma where clause for discoverable Pro creators (list + sitemap).
 */
export function discoverableCreatorsWhere(
  extra?: Prisma.CreatorWhereInput
): Prisma.CreatorWhereInput {
  const base: Prisma.CreatorWhereInput = {
    isPublic: true,
    platformSubscriptionActive: true,
    platformPlan: { in: [...PAID_PLAN_VALUES] },
    displayName: { not: '' },
    AND: [{ avatarUrl: { not: null } }, { avatarUrl: { not: '' } }],
    platformSubscriptions: {
      some: {
        status: { in: [...ACTIVE_SUB_STATUSES] },
      },
    },
  };

  if (!extra || Object.keys(extra).length === 0) return base;

  return {
    AND: [base, extra],
  };
}
