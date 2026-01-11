import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { CreatorDashboard } from '@/components/creator/Dashboard';
import { OnboardingPrompt } from '@/components/ui/onboarding-prompt';
import { OnboardingFlow } from '@/components/creator/OnboardingFlow';
import { getCreatorAnalytics, getRecentSubscriptions, getContentMetrics } from '@/lib/actions/analytics';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch creator data with proper cookie handling
  let creator = null;
  try {
    // Get cookies properly for the API call
    const cookieStore = await cookies();
    const cookieString = cookieStore.getAll()
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');

    const creatorRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/creator/me`, {
      headers: {
        Cookie: cookieString,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (creatorRes.ok) {
      creator = await creatorRes.json();

      // Convert serialized numbers back to numbers for client components
      if (creator) {
        // Convert financial fields back to numbers
        creator.balance = parseFloat(creator.balance) || 0;
        creator.pendingBalance = parseFloat(creator.pendingBalance) || 0;
        creator.totalEarnings = parseFloat(creator.totalEarnings) || 0;
        creator.monthlyEarnings = parseFloat(creator.monthlyEarnings) || 0;
        creator.payoutThreshold = parseFloat(creator.payoutThreshold) || 0;
        creator.currentBalance = parseFloat(creator.currentBalance) || 0;
        creator.chargebackRate = parseFloat(creator.chargebackRate) || 0;

        // Convert content prices and earnings
        if (creator.content) {
          creator.content = creator.content.map((item: any) => ({
            ...item,
            price: parseFloat(item.price) || 0,
            earnings: parseFloat(item.earnings) || 0
          }));
        }

        // Convert upload sizes (BigInt strings back to numbers)
        if (creator.uploads) {
          creator.uploads = creator.uploads.map((upload: any) => ({
            ...upload,
            size: parseInt(upload.size) || 0
          }));
        }
      }
    } else {
      console.error('Failed to fetch creator:', await creatorRes.text());
    }
  } catch (error) {
    console.error('Error fetching creator:', error);
  }

  // If no creator account, show onboarding prompt
  if (!creator) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <OnboardingPrompt
          userEmail={user.email || 'user'}
          completedSteps={0}
          totalSteps={4}
        />
      </div>
    );
  }

  // Check if creator has completed onboarding
  const hasCompletedOnboarding =
    creator.username &&
    creator.displayName &&
    creator.category; // Basic profile info is sufficient

  // If onboarding not completed, show onboarding flow
  if (!hasCompletedOnboarding) {
    return (
      <OnboardingFlow
        initialData={{
          username: creator.username,
          displayName: creator.displayName,
          bio: creator.bio,
          category: creator.category,
          instagramHandle: creator.instagramHandle,
          tiktokHandle: creator.tiktokHandle
        }}
      />
    );
  }

  // Fetch real analytics data
  const analytics = await getCreatorAnalytics(creator.id) || {
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

  const recentSubscriptions = await getRecentSubscriptions(creator.id) || [];
  const contentMetrics = await getContentMetrics(creator.id) || { topContent: [] };

  return (
    <CreatorDashboard
      creator={creator}
      analytics={analytics}
      recentSubscriptions={recentSubscriptions}
      contentMetrics={contentMetrics}
    />
  );
}
