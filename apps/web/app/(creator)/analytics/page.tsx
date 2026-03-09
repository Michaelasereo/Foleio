import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { getCreatorPlan, getPlanLimits } from '@/lib/utils/plan-limits';
import { CreatorAnalyticsClient } from '@/components/creator/CreatorAnalyticsClient';

export const revalidate = 0;

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

  return <CreatorAnalyticsClient creatorId={creator.id} initialStats={null} />;
}
