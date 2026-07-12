import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ACTIVE_BOOKING_STATUSES = [
  'pending',
  'paid',
  'first_payout_done',
  'service_day',
  'completed',
];

const PAID_BOOKING_STATUSES = [
  'paid',
  'first_payout_done',
  'service_day',
  'completed',
];

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalBookings,
      monthBookings,
      prevMonthBookings,
      upcomingBookings,
      completedBookings,
      currentMonthTransactions,
      prevMonthTransactions,
      recentBookings,
      bookingsByService,
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          creatorId: creator.id,
          status: { in: ACTIVE_BOOKING_STATUSES },
        },
      }),
      prisma.booking.count({
        where: {
          creatorId: creator.id,
          status: { in: ACTIVE_BOOKING_STATUSES },
          createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      prisma.booking.count({
        where: {
          creatorId: creator.id,
          status: { in: ACTIVE_BOOKING_STATUSES },
          createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
      }),
      prisma.booking.count({
        where: {
          creatorId: creator.id,
          bookingDate: { gte: today },
          status: { notIn: ['cancelled', 'refunded'] },
        },
      }),
      prisma.booking.count({
        where: {
          creatorId: creator.id,
          status: 'completed',
        },
      }),
      prisma.transaction.findMany({
        where: {
          creatorId: creator.id,
          status: 'success',
          createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        select: { netAmount: true, amount: true },
      }),
      prisma.transaction.findMany({
        where: {
          creatorId: creator.id,
          status: 'success',
          createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        select: { netAmount: true },
      }),
      prisma.booking.findMany({
        where: {
          creatorId: creator.id,
          status: { in: PAID_BOOKING_STATUSES },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          customerName: true,
          totalAmount: true,
          status: true,
          bookingDate: true,
          priceListItem: { select: { name: true } },
        },
      }),
      prisma.booking.groupBy({
        by: ['priceListItemId'],
        where: {
          creatorId: creator.id,
          status: { in: ACTIVE_BOOKING_STATUSES },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
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

    const serviceIds = bookingsByService.map((row) => row.priceListItemId);
    const services = serviceIds.length
      ? await prisma.priceListItem.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, name: true },
        })
      : [];
    const serviceNameById = new Map(services.map((s) => [s.id, s.name]));

    const averageBookingValue =
      completedBookings + monthBookings > 0 && totalBookings > 0
        ? Math.round(
            (await prisma.booking.aggregate({
              where: {
                creatorId: creator.id,
                status: { in: PAID_BOOKING_STATUSES },
              },
              _avg: { totalAmount: true },
            }))._avg.totalAmount || 0
          )
        : 0;

    return NextResponse.json({
      totalBookings,
      monthBookings,
      upcomingBookings,
      completedBookings,
      totalRevenue: currentMonthRevenue,
      averageBookingValue,
      percentageChanges: {
        earnings: calculatePercentageChange(currentMonthRevenue, prevMonthRevenue),
        bookings: calculatePercentageChange(monthBookings, prevMonthBookings),
      },
      recentBookings,
      topServices: bookingsByService.map((row) => ({
        id: row.priceListItemId,
        name: serviceNameById.get(row.priceListItemId) || 'Service',
        bookingCount: row._count.id,
        revenue: Number(row._sum.totalAmount || 0),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch creator stats', details: error?.message },
      { status: 500 }
    );
  }
}
