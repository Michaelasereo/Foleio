import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Lock, TrendingUp, Users, Video } from 'lucide-react';
import { formatNaira } from '@foleio/utils';
import { getCreatorPlan, getPlanLimits } from '@/lib/utils/plan-limits';
import { getCreatorAnalytics, getContentMetrics } from '@/lib/actions/analytics';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      displayName: true,
      platformPlan: true,
    },
  });

  if (!creator) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Finish setting up your creator profile in Settings to view analytics.
        </p>
      </div>
    );
  }

  const creatorPlan = getCreatorPlan(creator.platformPlan ?? null);
  const limits = getPlanLimits(creator.platformPlan ?? null);

  if (!limits.hasAnalytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track growth trends, content performance, and subscriber behavior.
          </p>
        </div>
        <Card className="border border-orange-200 bg-[#FFF8EE]">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <Lock className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="font-display text-2xl">Analytics is a Pro feature</CardTitle>
            <CardDescription>
              You are on <strong>{creatorPlan}</strong>. Upgrade to unlock full growth analytics and performance insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm font-medium">Current plan</p>
                <Badge variant="outline" className="mt-2">{creatorPlan}</Badge>
              </div>
              <div className="rounded-lg border border-orange-300 bg-white p-4">
                <p className="text-sm font-medium">Upgrade to Pro</p>
                <p className="mt-2 text-sm text-muted-foreground">NGN 8,000/month · unlock analytics</p>
              </div>
            </div>
            <Button asChild className="w-full bg-orange-600 text-white hover:bg-orange-700">
              <Link href="/billing?upgrade=pro">Upgrade to Pro</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analytics = (await getCreatorAnalytics(creator.id)) || {
    totalViews: 0,
    contentCount: 0,
    subscriberCount: 0,
    totalRevenue: 0,
    engagementRate: '0.0',
  };
  const contentMetrics = (await getContentMetrics(creator.id)) || { topContent: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Understand what is growing your audience and revenue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(analytics.totalViews || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(analytics.subscriberCount || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue (30d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNaira(Number(analytics.totalRevenue || 0) / 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published Content</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(analytics.contentCount || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
          <CardDescription>Your most viewed content this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contentMetrics.topContent?.length ? (
              contentMetrics.topContent.map((content: any) => (
                <div key={content.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{content.title}</p>
                    <p className="text-xs text-muted-foreground">{content.type}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{content.viewCount} views</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No content analytics yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
