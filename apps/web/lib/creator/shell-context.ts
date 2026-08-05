import { prisma } from '@foleio/database';
import { getCreatorForUser, getCurrentUser } from '@/lib/creator/cached-lookups';
import { getDeveloperSupportSession } from '@/lib/developer-support/session';

const creatorShellSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bannerUrl: true,
  category: true,
  platformPlan: true,
  platformSubscriptionActive: true,
  isBanned: true,
  currentBalance: true,
  hasSeenWelcome: true,
  hasCompletedTour: true,
  contentCount: true,
  balanceDueDaysBefore: true,
  bookingPolicyType: true,
  bookingPolicyFileUrl: true,
  bookingPolicyFileName: true,
  bookingPolicyLinkUrl: true,
} as const;

export type CreatorShellContext = {
  creator: Awaited<ReturnType<typeof getCreatorForUser>>;
  supportMode: boolean;
  lookupFailed: boolean;
  authenticated: boolean;
};

export async function resolveCreatorShellContext(): Promise<CreatorShellContext> {
  const supportSession = await getDeveloperSupportSession();
  if (supportSession) {
    try {
      const creator = await prisma.creator.findUnique({
        where: { id: supportSession.creatorId },
        select: creatorShellSelect,
      });
      if (creator) {
        return {
          creator,
          supportMode: true,
          lookupFailed: false,
          authenticated: false,
        };
      }
    } catch {
      return { creator: null, supportMode: true, lookupFailed: true, authenticated: false };
    }
  }

  const user = await getCurrentUser();
  if (!user) {
    return { creator: null, supportMode: false, lookupFailed: false, authenticated: false };
  }

  try {
    const creator = await getCreatorForUser(user.id);
    return {
      creator,
      supportMode: false,
      lookupFailed: false,
      authenticated: true,
    };
  } catch {
    return { creator: null, supportMode: false, lookupFailed: true, authenticated: true };
  }
}
