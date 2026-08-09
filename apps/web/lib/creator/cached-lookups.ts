import { cache } from 'react';
import { prisma } from '@foleio/database';
import { createClient } from '@/lib/supabase/server';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/** Request-scoped Supabase user (dedupes layout + page getUser). */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

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
  fixedBookingsEnabled: true,
  customQuotesEnabled: true,
  shopEnabled: true,
  quoteWhatsappPhone: true,
} as const;

export type CreatorForUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  category: string;
  platformPlan: string | null;
  platformSubscriptionActive: boolean;
  isBanned: boolean;
  currentBalance: bigint;
  hasSeenWelcome: boolean;
  hasCompletedTour: boolean;
  contentCount: number;
  balanceDueDaysBefore: number;
  bookingPolicyType: string | null;
  bookingPolicyFileUrl: string | null;
  bookingPolicyFileName: string | null;
  bookingPolicyLinkUrl: string | null;
  fixedBookingsEnabled: boolean;
  customQuotesEnabled: boolean;
  shopEnabled: boolean;
  quoteWhatsappPhone: string | null;
};

/**
 * Creator row for authenticated shells + dashboard.
 * Same select everywhere so layout + page share one Prisma round trip.
 */
export const getCreatorForUser = cache(async (userId: string): Promise<CreatorForUser | null> => {
  return withTimeout(
    prisma.creator.findUnique({
      where: { userId },
      select: creatorShellSelect,
    }),
    6000
  );
});

const publicCreatorLeanSelect = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  category: true,
  avatarUrl: true,
  bannerUrl: true,
  instagramHandle: true,
  tiktokHandle: true,
  subscriberCount: true,
  contentCount: true,
  platformPlan: true,
  platformSubscriptionActive: true,
  paystackSubaccountCode: true,
  subaccountStatus: true,
  bvnVerified: true,
  bookingPolicyType: true,
  bookingPolicyFileUrl: true,
  bookingPolicyFileName: true,
  bookingPolicyLinkUrl: true,
  fixedBookingsEnabled: true,
  customQuotesEnabled: true,
  shopEnabled: true,
  quoteWhatsappPhone: true,
  introVideo: {
    select: {
      id: true,
      title: true,
      muxAssetId: true,
      muxPlaybackId: true,
      thumbnailUrl: true,
      description: true,
    },
  },
  creatorLinks: {
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' as const },
  },
  platformSubscriptions: {
    select: { status: true },
    take: 1,
  },
  products: {
    where: {
      status: 'active',
      OR: [{ type: 'digital' }, { stock: { gt: 0 } }],
    },
    select: { id: true },
    take: 1,
  },
  priceListItems: {
    where: { isActive: true },
    select: { id: true },
    take: 1,
  },
};

/**
 * Lean public creator for generateMetadata + first paint.
 * Dedupes metadata + page within one request.
 */
export const getPublicCreatorByUsername = cache(async (username: string) => {
  return prisma.creator.findUnique({
    where: { username, isPublic: true },
    select: publicCreatorLeanSelect,
  });
});
