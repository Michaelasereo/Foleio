'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@odim/database';
import { serializePrismaObject } from '@/lib/utils/serialization';

export async function getCreatorAnalytics(creatorId: string) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  try {
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId, userId: session.user.id },
    });

    if (!creator) {
      return null;
    }

    // Calculate date ranges for current and previous month
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Get current month content stats
    const currentMonthContentStats = await prisma.content.aggregate({
      where: {
        creatorId,
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      _sum: { viewCount: true },
    });

    // Get previous month content stats
    const prevMonthContentStats = await prisma.content.aggregate({
      where: {
        creatorId,
        createdAt: {
          gte: prevMonthStart,
          lte: prevMonthEnd,
        },
      },
      _sum: { viewCount: true },
    });

    // Get all-time content stats for total views
    const contentStats = await prisma.content.aggregate({
      where: { creatorId },
      _sum: { viewCount: true },
      _count: { id: true },
    });

    // Get current month subscriptions
    const currentMonthSubscriptions = await prisma.fanSubscription.count({
      where: {
        creatorId,
        status: 'active',
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    // Get previous month subscriptions
    const prevMonthSubscriptions = await prisma.fanSubscription.count({
      where: {
        creatorId,
        status: 'active',
        createdAt: {
          gte: prevMonthStart,
          lte: prevMonthEnd,
        },
      },
    });

    // Get total active subscriptions
    const subscriptionStats = await prisma.fanSubscription.aggregate({
      where: { creatorId, status: 'active' },
      _count: { id: true },
    });

    // Get current month transactions
    const currentMonthTransactions = await prisma.transaction.findMany({
      where: {
        creatorId,
        status: 'success',
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    // Get previous month transactions
    const prevMonthTransactions = await prisma.transaction.findMany({
      where: {
        creatorId,
        status: 'success',
        createdAt: {
          gte: prevMonthStart,
          lte: prevMonthEnd,
        },
      },
    });

    const currentMonthRevenue = currentMonthTransactions.reduce(
      (sum: number, t: { netAmount: number | null }) => sum + Number(t.netAmount || 0),
      0
    );

    const prevMonthRevenue = prevMonthTransactions.reduce(
      (sum: number, t: { netAmount: number | null }) => sum + Number(t.netAmount || 0),
      0
    );

    // Get recent transactions for display
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        creatorId,
        status: 'success',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const totalRevenue = recentTransactions.reduce(
      (sum: number, t: { netAmount: number | null }) => sum + Number(t.netAmount || 0),
      0
    );

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number): string | null => {
      if (previous === 0) {
        if (current === 0) return null; // No data for either month
        return '+100%'; // New data this month
      }
      const change = ((current - previous) / previous) * 100;
      const sign = change >= 0 ? '+' : '';
      return `${sign}${change.toFixed(1)}%`;
    };

    const earningsChange = calculatePercentageChange(currentMonthRevenue, prevMonthRevenue);
    const subscribersChange = calculatePercentageChange(currentMonthSubscriptions, prevMonthSubscriptions);
    const viewsChange = calculatePercentageChange(
      currentMonthContentStats._sum.viewCount || 0,
      prevMonthContentStats._sum.viewCount || 0
    );

    // Calculate engagement rate (simplified: views per subscriber)
    const currentEngagement = subscriptionStats._count.id > 0
      ? ((currentMonthContentStats._sum.viewCount || 0) / subscriptionStats._count.id) * 100
      : 0;
    
    const prevEngagement = subscriptionStats._count.id > 0
      ? ((prevMonthContentStats._sum.viewCount || 0) / subscriptionStats._count.id) * 100
      : 0;

    const engagementChange = calculatePercentageChange(currentEngagement, prevEngagement);
    const engagementRate = subscriptionStats._count.id > 0
      ? ((contentStats._sum.viewCount || 0) / subscriptionStats._count.id) * 100
      : 0;

    const result = {
      totalViews: contentStats._sum.viewCount || 0,
      contentCount: contentStats._count.id || 0,
      subscriberCount: subscriptionStats._count.id || 0,
      totalRevenue,
      recentTransactions,
      percentageChanges: {
        earnings: earningsChange,
        subscribers: subscribersChange,
        views: viewsChange,
        engagement: engagementChange,
      },
      engagementRate: engagementRate.toFixed(1),
    };

    // Serialize all Prisma special types
    return serializePrismaObject(result);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return null;
  }
}

export async function getRecentSubscriptions(creatorId: string) {
  try {
    const subscriptions = await prisma.fanSubscription.findMany({
      where: { creatorId, status: 'active' },
      include: {
        fan: {
          select: {
            fullName: true,
            email: true,
          },
        },
        plan: {
          select: {
            name: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Serialize all Prisma special types
    return serializePrismaObject(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }
}

export async function getContentMetrics(creatorId: string) {
  try {
    const topContent = await prisma.content.findMany({
      where: { creatorId, isPublished: true },
      orderBy: { viewCount: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        type: true,
        viewCount: true,
        likeCount: true,
        createdAt: true,
      },
    });

    // Serialize all Prisma special types
    return serializePrismaObject({ topContent });
  } catch (error) {
    console.error('Error fetching content metrics:', error);
    return { topContent: [] };
  }
}

