'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Layers, TrendingUp, Users, Video } from 'lucide-react';
import { formatNaira } from '@foleio/utils';
import { AnimatedCount } from '@/components/ui/AnimatedCount';

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
};

export function CreatorAnalyticsClient({
  initialStats,
  creatorId,
}: {
  initialStats: any;
  creatorId: string;
}) {
  const { data: stats, mutate } = useSWR('/api/creator/stats', fetcher, {
    fallbackData: initialStats,
    refreshInterval: 30000,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('creator-analytics-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `creator_id=eq.${creatorId}` },
        () => {
          void mutate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content', filter: `creator_id=eq.${creatorId}` },
        () => {
          void mutate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fan_subscriptions',
          filter: `creator_id=eq.${creatorId}`,
        },
        () => {
          void mutate();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [creatorId, mutate]);

  const safeStats = stats || {
    totalViews: 0,
    contentCount: 0,
    collectionCount: 0,
    subscriberCount: 0,
    totalRevenue: 0,
    engagementRate: '0.0',
    topContent: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        </div>
        <p className="text-muted-foreground">
          Understand what is growing your audience and revenue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              <AnimatedCount value={Number(safeStats.totalViews || 0)} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              <AnimatedCount value={Number(safeStats.subscriberCount || 0)} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue (30d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNaira(Number(safeStats.totalRevenue || 0) / 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published Content</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              <AnimatedCount value={Number(safeStats.contentCount || 0)} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published Collections</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              <AnimatedCount value={Number(safeStats.collectionCount || 0)} />
            </p>
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
            {safeStats.topContent?.length ? (
              safeStats.topContent.map((content: any) => (
                <div key={content.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{content.title}</p>
                    <p className="text-xs text-muted-foreground">{content.type}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <AnimatedCount value={Number(content.viewCount || 0)} /> views
                  </p>
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
