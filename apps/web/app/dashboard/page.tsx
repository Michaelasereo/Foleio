import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { CreatorDashboard } from '@/components/creator/Dashboard';
import { OnboardingGateModal } from '@/components/creator/OnboardingGateModal';
import { getCreatorAnalytics, getRecentSubscriptions, getContentMetrics } from '@/lib/actions/analytics';

export const revalidate = 0;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch creator directly from DB to avoid slow internal API roundtrip on first load.
  let creator: {
    id: string;
    username: string;
    displayName: string;
    category: string;
    platformPlan: string | null;
    contentCount: number;
    hasSeenWelcome: boolean;
    hasCompletedTour: boolean;
  } | null = null;
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
        },
      }),
      3000
    );

    if (dbCreator) {
      const contentCount = await withTimeout(
        prisma.content.count({
          where: { creatorId: dbCreator.id, isPublished: true },
        }),
        3000
      );
      creator = {
        ...dbCreator,
        contentCount,
        hasSeenWelcome: false,
        hasCompletedTour: false,
      };
      try {
        const flags = await withTimeout(
          prisma.$queryRaw<
            Array<{ has_seen_welcome: boolean | null; has_completed_tour: boolean | null }>
          >`
            SELECT has_seen_welcome, has_completed_tour
            FROM creators
            WHERE id = ${dbCreator.id}
            LIMIT 1
          `,
          2500
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

  // If no creator account, block dashboard usage and force onboarding.
  if (!creator) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OnboardingGateModal open userEmail={user.email || 'user'} />
      </div>
    );
  }

  // Check if creator has completed onboarding
  const hasCompletedOnboarding =
    creator.username &&
    creator.displayName &&
    creator.category; // Basic profile info is sufficient

  // Fetch analytics in parallel so one slow query does not block full page render.
  const [analyticsResult, recentSubscriptionsResult, contentMetricsResult] = await Promise.all([
    withTimeout(getCreatorAnalytics(creator.id), 3500).catch(() => null),
    withTimeout(getRecentSubscriptions(creator.id), 3500).catch(() => []),
    withTimeout(getContentMetrics(creator.id), 3500).catch(() => ({ topContent: [] })),
  ]);

  const analytics = analyticsResult || {
    totalViews: 0,
    contentCount: 0,
    subscriberCount: 0,
    totalRevenue: 0,
    recentTransactions: [],
    percentageChanges: {
      earnings: null,
      subscribers: null,
      views: null,
      engagement: null,
    },
    engagementRate: '0.0',
  };
  const recentSubscriptions = recentSubscriptionsResult || [];
  const contentMetrics = contentMetricsResult || { topContent: [] };

  return (
    <CreatorDashboard
      creator={creator}
      profileIncomplete={!hasCompletedOnboarding}
      analytics={analytics}
      recentSubscriptions={recentSubscriptions}
      contentMetrics={contentMetrics}
    />
  );
}
