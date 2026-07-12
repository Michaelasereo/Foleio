import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { CreatorDashboard } from '@/components/creator/Dashboard';
import { getCreatorAnalytics } from '@/lib/actions/analytics';

export const revalidate = 0;

const PREVIEW_CREATOR = {
  id: 'preview',
  username: 'preview',
  displayName: 'Preview Creator',
  category: 'beauty',
  platformPlan: null as string | null,
  currentBalance: 0,
  contentCount: 0,
  hasSeenWelcome: true,
  hasCompletedTour: true,
  email: 'preview@foleio.app',
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const params = (await searchParams) || {};
  const isPreview = params.preview === '1';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPreview) {
    redirect('/login');
  }

  let creator: {
    id: string;
    username: string;
    displayName: string;
    category: string;
    platformPlan: string | null;
    currentBalance: number;
    contentCount: number;
    hasSeenWelcome: boolean;
    hasCompletedTour: boolean;
    email?: string;
  } | null = null;

  if (user) {
    try {
      const dbCreator = await withTimeout(
        prisma.creator.findUnique({
          where: { userId: user.id },
          select: {
            id: true,
            username: true,
            displayName: true,
            category: true,
            platformPlan: true,
            currentBalance: true,
          },
        }),
        15000
      );

      if (dbCreator) {
        const contentCount = await withTimeout(
          prisma.content.count({
            where: { creatorId: dbCreator.id, isPublished: true },
          }),
          8000
        );
        creator = {
          ...dbCreator,
          contentCount,
          hasSeenWelcome: false,
          hasCompletedTour: false,
          email: user.email || undefined,
        };
        try {
          const flags = await withTimeout(
            prisma.$queryRaw<
              Array<{
                has_seen_welcome: boolean | null;
                has_completed_tour: boolean | null;
              }>
            >`
              SELECT has_seen_welcome, has_completed_tour
              FROM creators
              WHERE id = ${dbCreator.id}
              LIMIT 1
            `,
            8000
          );
          creator.hasSeenWelcome = flags[0]?.has_seen_welcome ?? false;
          creator.hasCompletedTour = flags[0]?.has_completed_tour ?? false;
        } catch {
          // Non-fatal: keep defaults if flags are unavailable.
        }
      }
    } catch (error) {
      console.error('Error fetching creator:', error);
    }
  }

  // Design review: never block on onboarding / welcome gates.
  if (!creator) {
    creator = {
      ...PREVIEW_CREATOR,
      email: user?.email || PREVIEW_CREATOR.email,
    };
  } else {
    creator = {
      ...creator,
      hasSeenWelcome: true,
      hasCompletedTour: true,
      displayName: creator.displayName || PREVIEW_CREATOR.displayName,
      username: creator.username || PREVIEW_CREATOR.username,
      category: creator.category || PREVIEW_CREATOR.category,
    };
  }

  const { end: monthEnd } = monthBounds();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeBookingStatuses = [
    'pending',
    'paid',
    'first_payout_done',
    'service_day',
    'completed',
  ];

  const emptyAnalytics = {
    totalViews: 0,
    contentCount: 0,
    subscriberCount: 0,
    totalRevenue: 0,
    recentTransactions: [],
    percentageChanges: {
      earnings: null as string | null,
      subscribers: null as string | null,
      views: null as string | null,
      engagement: null as string | null,
    },
    engagementRate: '0.0',
  };

  let analyticsResult = null;
  let totalBookingsResult = 0;
  let upcomingCountResult = 0;
  let upcomingBookingsResult: Array<{
    id: string;
    customerName: string;
    bookingDate: Date;
    totalAmount: number;
    status: string;
    priceListItem: { name: string } | null;
  }> = [];

  if (creator.id !== 'preview') {
    const results = await Promise.all([
      withTimeout(getCreatorAnalytics(creator.id), 3500).catch(() => null),
      withTimeout(
        prisma.booking.count({
          where: {
            creatorId: creator.id,
            status: { in: activeBookingStatuses },
          },
        }),
        3500
      ).catch(() => 0),
      withTimeout(
        prisma.booking.count({
          where: {
            creatorId: creator.id,
            bookingDate: { gte: today, lte: monthEnd },
            status: { notIn: ['cancelled', 'refunded'] },
          },
        }),
        3500
      ).catch(() => 0),
      withTimeout(
        prisma.booking.findMany({
          where: {
            creatorId: creator.id,
            bookingDate: { gte: today, lte: monthEnd },
            status: { notIn: ['cancelled', 'refunded'] },
          },
          orderBy: { bookingDate: 'asc' },
          take: 2,
          select: {
            id: true,
            customerName: true,
            bookingDate: true,
            totalAmount: true,
            status: true,
            priceListItem: {
              select: { name: true },
            },
          },
        }),
        3500
      ).catch(() => []),
    ]);
    analyticsResult = results[0];
    totalBookingsResult = results[1] || 0;
    upcomingCountResult = results[2] || 0;
    upcomingBookingsResult = results[3] || [];
  }

  const analytics = analyticsResult || emptyAnalytics;

  return (
    <CreatorDashboard
      creator={creator}
      profileIncomplete={false}
      analytics={analytics}
      bookingStats={{
        totalBookings: totalBookingsResult || 0,
        upcomingBookings: upcomingCountResult || 0,
      }}
      upcomingBookings={upcomingBookingsResult || []}
    />
  );
}
