'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Users,
  Video,
  TrendingUp,
  Download,
} from 'lucide-react';
import { formatNaira } from '@odim/utils';

interface CreatorDashboardProps {
  creator: any;
  analytics: any;
  recentSubscriptions: any[];
  contentMetrics: any;
}

export function CreatorDashboard({
  creator,
  analytics,
  recentSubscriptions,
  contentMetrics,
}: CreatorDashboardProps) {
  const router = useRouter();

  // Format percentage change with proper styling
  const formatChange = (change: string | null | undefined) => {
    if (!change) return '—';
    const isPositive = change.startsWith('+');
    const color = isPositive ? 'text-green-600' : change.startsWith('-') ? 'text-red-600' : 'text-gray-500';
    return <span className={color}>{change}</span>;
  };

  const stats = [
    {
      title: 'Total Earnings',
      value: formatNaira(Number(creator.totalEarnings) / 100),
      change: analytics?.percentageChanges?.earnings || null,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Subscribers',
      value: creator.subscriberCount.toLocaleString(),
      change: analytics?.percentageChanges?.subscribers || null,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Content Views',
      value: (analytics?.totalViews || 0).toLocaleString(),
      change: analytics?.percentageChanges?.views || null,
      icon: Video,
      color: 'text-purple-600',
    },
    {
      title: 'Engagement Rate',
      value: `${analytics?.engagementRate || '0.0'}%`,
      change: analytics?.percentageChanges?.engagement || null,
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {creator.displayName}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your creator account
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/content/new')}
          >
            <Video className="mr-2 h-4 w-4" />
            New Content
          </Button>
          <Button
            onClick={() => router.push('/payouts')}
            disabled={Number(creator.currentBalance) < 1000}
          >
            <Download className="mr-2 h-4 w-4" />
            Withdraw{' '}
            {formatNaira(Number(creator.currentBalance) / 100)}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {formatChange(stat.change)} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Subscribers */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Subscribers</CardTitle>
            <CardDescription>
              {recentSubscriptions.length} new subscribers this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="font-medium">
                      {sub.fan?.fullName || 'Anonymous'}
                    </div>
                    <Badge variant="secondary">
                      {formatNaira((sub.plan?.price || 0) / 100)}/month
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Content */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Performing Content</CardTitle>
            <CardDescription>
              Your most viewed content this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contentMetrics?.topContent?.map((content: any) => (
                <div
                  key={content.id}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {content.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {content.viewCount} views
                    </p>
                  </div>
                  <Badge variant="outline">{content.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

