import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999
    );

    const [
      currentMonthContentStats,
      prevMonthContentStats,
      allPublishedContentStats,
      publishedCollectionsCount,
      currentMonthSubscriptions,
      prevMonthSubscriptions,
      subscriptionStats,
      currentMonthTransactions,
      prevMonthTransactions,
      topContent,
    ] = await Promise.all([
      prisma.content.aggregate({
        where: {
          creatorId: creator.id,
          createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { viewCount: true },
      }),
      prisma.content.aggregate({
        where: {
          creatorId: creator.id,
          createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        _sum: { viewCount: true },
      }),
      prisma.content.aggregate({
        where: { creatorId: creator.id },
        _sum: { viewCount: true },
        _count: { id: true },
      }),
      prisma.collection.count({
        where: { creatorId: creator.id, isPublished: true },
      }),
      prisma.fanSubscription.count({
        where: {
          creatorId: creator.id,
          status: 'active',
          createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      prisma.fanSubscription.count({
        where: {
          creatorId: creator.id,
          status: 'active',
          createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
      }),
      prisma.fanSubscription.aggregate({
        where: { creatorId: creator.id, status: 'active' },
        _count: { id: true },
      }),
      prisma.transaction.findMany({
        where: {
          creatorId: creator.id,
          status: 'success',
          createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        select: { netAmount: true },
      }),
      prisma.transaction.findMany({
        where: {
          creatorId: creator.id,
          status: 'success',
          createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        select: { netAmount: true },
      }),
      prisma.content.findMany({
        where: { creatorId: creator.id },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          viewCount: true,
        },
      }),
    ]);

    const currentMonthRevenue = currentMonthTransactions.reduce(
      (sum, tx) => sum + Number(tx.netAmount || 0),
      0
    );
    const prevMonthRevenue = prevMonthTransactions.reduce(
      (sum, tx) => sum + Number(tx.netAmount || 0),
      0
    );

    const calculatePercentageChange = (current: number, previous: number): string | null => {
      if (previous === 0) return current === 0 ? null : '+100%';
      const change = ((current - previous) / previous) * 100;
      const sign = change >= 0 ? '+' : '';
      return `${sign}${change.toFixed(1)}%`;
    };

    const viewsCurrent = Number(currentMonthContentStats._sum.viewCount || 0);
    const viewsPrevious = Number(prevMonthContentStats._sum.viewCount || 0);
    const totalViews = Number(allPublishedContentStats._sum.viewCount || 0);
    const subscriberCount = Number(subscriptionStats._count.id || 0);
    const engagementRate =
      subscriberCount > 0 ? ((totalViews / subscriberCount) * 100).toFixed(1) : '0.0';

    return NextResponse.json({
      totalViews,
      contentCount: Number(allPublishedContentStats._count.id || 0),
      collectionCount: publishedCollectionsCount, // published only (no drafts)
      subscriberCount,
      totalRevenue: currentMonthRevenue,
      engagementRate,
      percentageChanges: {
        earnings: calculatePercentageChange(currentMonthRevenue, prevMonthRevenue),
        subscribers: calculatePercentageChange(currentMonthSubscriptions, prevMonthSubscriptions),
        views: calculatePercentageChange(viewsCurrent, viewsPrevious),
        engagement: null,
      },
      topContent,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch creator stats', details: error?.message },
      { status: 500 }
    );
  }
}
