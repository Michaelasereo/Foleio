import { redirect } from 'next/navigation';
import { prisma } from '@foleio/database';
import { CreatorDashboard } from '@/components/creator/Dashboard';
import { sumCreatorEarnings } from '@/lib/creator/earnings';
import { getCreatorForUser, getCurrentUser } from '@/lib/creator/cached-lookups';

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

async function getLeanDashboardAnalytics(creatorId: string) {
  const paidOrderStatuses = ['confirmed', 'processing', 'delivered', 'in_progress', 'shipped'];

  const [earnings, productCount, soldAgg] = await Promise.all([
    sumCreatorEarnings(creatorId).catch(() => ({
      totalEarnings: 0,
      currentMonth: 0,
      prevMonth: 0,
    })),
    prisma.product.count({ where: { creatorId } }).catch(() => 0),
    prisma.orderItem
      .aggregate({
        where: {
          order: {
            creatorId,
            status: { in: paidOrderStatuses },
          },
        },
        _sum: { quantity: true },
      })
      .catch(() => ({ _sum: { quantity: null as number | null } })),
  ]);

  const shopSetup = productCount > 0;

  return {
    totalViews: 0,
    contentCount: 0,
    subscriberCount: 0,
    totalRevenue: earnings.totalEarnings,
    currentMonth: earnings.currentMonth,
    recentTransactions: [],
    percentageChanges: {
      earnings: null as string | null,
      subscribers: null as string | null,
      views: null as string | null,
    },
    shopSetup,
    productsSold: shopSetup ? soldAgg._sum.quantity || 0 : null,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const params = (await searchParams) || {};
  const isPreview = params.preview === '1';

  const user = await getCurrentUser();

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
      const dbCreator = await getCreatorForUser(user.id);

      if (dbCreator) {
        creator = {
          id: dbCreator.id,
          username: dbCreator.username,
          displayName: dbCreator.displayName,
          category: dbCreator.category,
          platformPlan: dbCreator.platformPlan,
          currentBalance: Number(dbCreator.currentBalance ?? 0),
          contentCount: dbCreator.contentCount || 0,
          hasSeenWelcome: dbCreator.hasSeenWelcome,
          hasCompletedTour: dbCreator.hasCompletedTour,
          email: user.email || undefined,
        };
      }
    } catch (error) {
      console.error('Error fetching creator:', error);
    }
  }

  // Authenticated users without a Creator profile must finish /onboard first.
  // Preview mode (?preview=1) still uses the stub for design review.
  if (!creator) {
    if (user && !isPreview) {
      redirect('/onboard');
    }
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
    currentMonth: 0,
    recentTransactions: [],
    percentageChanges: {
      earnings: null as string | null,
      subscribers: null as string | null,
      views: null as string | null,
    },
    shopSetup: false,
    productsSold: null as number | null,
  };

  let analyticsResult = emptyAnalytics;
  let totalBookingsResult = 0;
  let upcomingCountResult = 0;
  let upcomingBookingsResult: Array<{
    id: string;
    customerName: string;
    bookingDate: Date;
    startTime: string | null;
    totalAmount: number;
    balanceAmount: number;
    status: string;
    customerAddress: string;
    priceListItem: { name: string } | null;
  }> = [];
  let quotesResult: Array<{
    id: string;
    title: string;
    customerName: string;
    totalAmount: number;
    status: string;
    serviceDate: Date | null;
  }> = [];
  let ordersResult: Array<{
    id: string;
    status: string;
    total: number;
    createdAt: Date;
    deliveryAddress: unknown;
    items: Array<{ product: { name: string } | null }>;
  }> = [];
  let paymentsResult: Array<{
    id: string;
    createdAt: Date;
    type: string;
    creatorEarnings: number;
    platformFee: number;
    metadata: unknown;
  }> = [];
  let weeksResult: Array<{ label: string; amount: number }> = [];
  let lowStockResult: Array<{ id: string; name: string; stock: number | null; price: number }> = [];
  let preordersResult: Array<{ id: string; name: string; price: number }> = [];
  let bankLabel: string | null = null;

  if (creator.id !== 'preview') {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const seriesStart = new Date(weekStart);
    seriesStart.setDate(seriesStart.getDate() - 7 * 7);

    const [analytics, upcomingBookings, totalBookings, upcomingCount, quotes, orders, payments, lowStock, preorders, bank] =
      await Promise.all([
        withTimeout(getLeanDashboardAnalytics(creator.id), 8000).catch(() => emptyAnalytics),
        withTimeout(
          prisma.booking.findMany({
            where: {
              creatorId: creator.id,
              bookingDate: { gte: today },
              status: { notIn: ['cancelled', 'canceled', 'refunded'] },
            },
            orderBy: { bookingDate: 'asc' },
            take: 8,
            select: {
              id: true,
              customerName: true,
              bookingDate: true,
              startTime: true,
              totalAmount: true,
              balanceAmount: true,
              status: true,
              customerAddress: true,
              priceListItem: { select: { name: true } },
            },
          }),
          5000
        ).catch(() => []),
        withTimeout(
          prisma.booking.count({
            where: { creatorId: creator.id, status: { in: activeBookingStatuses } },
          }),
          5000
        ).catch(() => 0),
        withTimeout(
          prisma.booking.count({
            where: {
              creatorId: creator.id,
              bookingDate: { gte: today, lte: monthEnd },
              status: { notIn: ['cancelled', 'canceled', 'refunded'] },
            },
          }),
          5000
        ).catch(() => 0),
        withTimeout(
          prisma.quote.findMany({
            where: { creatorId: creator.id },
            orderBy: { createdAt: 'desc' },
            take: 4,
            select: {
              id: true,
              title: true,
              customerName: true,
              totalAmount: true,
              status: true,
              serviceDate: true,
            },
          }),
          5000
        ).catch(() => []),
        withTimeout(
          prisma.order.findMany({
            where: { creatorId: creator.id },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
              id: true,
              status: true,
              total: true,
              createdAt: true,
              deliveryAddress: true,
              items: { take: 1, select: { product: { select: { name: true } } } },
            },
          }),
          5000
        ).catch(() => []),
        withTimeout(
          prisma.transaction.findMany({
            where: {
              creatorId: creator.id,
              createdAt: { gte: seriesStart },
              type: { notIn: ['payout', 'platform_fee'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 80,
            select: {
              id: true,
              createdAt: true,
              type: true,
              creatorEarnings: true,
              platformFee: true,
              metadata: true,
            },
          }),
          5000
        ).catch(() => []),
        withTimeout(
          prisma.product.findMany({
            where: { creatorId: creator.id, status: 'active', stock: { not: null, lte: 4 } },
            orderBy: { stock: 'asc' },
            take: 4,
            select: { id: true, name: true, stock: true, price: true },
          }),
          5000
        ).catch(() => []),
        withTimeout(
          prisma.product.findMany({
            where: { creatorId: creator.id, status: 'active', isPreorder: true },
            orderBy: { updatedAt: 'desc' },
            take: 4,
            select: { id: true, name: true, price: true },
          }),
          5000
        ).catch(() => []),
        withTimeout(
          prisma.bankAccount.findUnique({
            where: { creatorId: creator.id },
            select: { bankName: true, accountNumber: true },
          }),
          5000
        ).catch(() => null),
      ]);

    analyticsResult = analytics;
    upcomingBookingsResult = upcomingBookings || [];
    upcomingCountResult = upcomingCount || 0;
    totalBookingsResult = totalBookings || 0;
    quotesResult = quotes || [];
    ordersResult = orders || [];
    paymentsResult = (payments || []).map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      type: row.type,
      creatorEarnings: Number(row.creatorEarnings || 0),
      platformFee: Number(row.platformFee || 0),
      metadata: row.metadata,
    }));
    lowStockResult = lowStock || [];
    preordersResult = preorders || [];
    bankLabel = bank
      ? `${bank.bankName} ··${bank.accountNumber.slice(-4)}`
      : null;
    weeksResult = Array.from({ length: 8 }, (_, index) => {
      const start = new Date(weekStart);
      start.setDate(start.getDate() - (7 - index) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const amount = paymentsResult
        .filter((row) => row.createdAt >= start && row.createdAt < end)
        .reduce((sum, row) => sum + row.creatorEarnings, 0);
      return {
        label: start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        amount,
      };
    });
  }

  return (
    <CreatorDashboard
      creator={creator}
      profileIncomplete={false}
      analytics={analyticsResult}
      bookingStats={{
        totalBookings: totalBookingsResult || 0,
        upcomingBookings: upcomingCountResult || 0,
      }}
      upcomingBookings={upcomingBookingsResult || []}
      quotes={quotesResult}
      orders={ordersResult}
      payments={paymentsResult.slice(0, 6)}
      weeks={weeksResult}
      lowStock={lowStockResult}
      preorders={preordersResult}
      bankLabel={bankLabel}
    />
  );
}
