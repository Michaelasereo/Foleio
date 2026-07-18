import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { feePercentForCreator, toFeePlanInput, PLATFORM_SUB_FEE_SELECT } from '@/lib/billing/platform-fee';
import {
  creatorShareFromGross,
  sumCreatorEarnings,
} from '@/lib/creator/earnings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ACTIVE_BOOKING_STATUSES = [
  'pending',
  'deposit_paid',
  'balance_overdue',
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

const PAID_ORDER_STATUSES = [
  'confirmed',
  'processing',
  'delivered',
  'in_progress',
  'shipped',
];

function monthBounds(offset = 0, from = new Date()) {
  const base = new Date(from.getFullYear(), from.getMonth() + offset, 1);
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(
    base.getFullYear(),
    base.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return { start, end };
}

function buildMonthBuckets(count = 6) {
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const { start, end } = monthBounds(-i);
    buckets.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      month: start.toLocaleString('en-US', { month: 'short' }),
      start,
      end,
      income: 0,
      count: 0,
    });
  }
  return buckets;
}

function percentageChange(current: number, previous: number): string | null {
  if (previous === 0) return current === 0 ? null : '+100%';
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

function customerNameFromAddress(address: unknown): string {
  if (!address || typeof address !== 'object') return 'Customer';
  const row = address as Record<string, unknown>;
  const first = typeof row.firstName === 'string' ? row.firstName.trim() : '';
  const last = typeof row.lastName === 'string' ? row.lastName.trim() : '';
  const full = `${first} ${last}`.trim();
  if (full) return full;
  if (typeof row.name === 'string' && row.name.trim()) return row.name.trim();
  if (typeof row.email === 'string' && row.email.trim()) return row.email.trim();
  return 'Customer';
}

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
      select: {
        id: true,
        platformPlan: true,
        platformSubscriptionActive: true,
        platformSubscriptions: {
          select: PLATFORM_SUB_FEE_SELECT,
          take: 1,
        },
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const feePct = feePercentForCreator(toFeePlanInput(creator));
    const now = new Date();
    const { start: currentMonthStart, end: currentMonthEnd } = monthBounds(0, now);
    const { start: prevMonthStart, end: prevMonthEnd } = monthBounds(-1, now);
    const seriesStart = monthBounds(-5, now).start;
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const [
      totalBookings,
      bookingsThisMonth,
      prevMonthBookings,
      upcomingBookings,
      earnings,
      avgBooking,
      recentBookings,
      bookingsByService,
      paidBookingsForSeries,
      totalOrders,
      ordersThisMonth,
      prevMonthOrders,
      productsSoldAgg,
      avgOrder,
      shopRevenueAll,
      shopRevenueCurrent,
      shopRevenuePrev,
      recentOrders,
      orderItemsByProduct,
      paidOrdersForSeries,
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
      sumCreatorEarnings(creator.id),
      prisma.booking.aggregate({
        where: {
          creatorId: creator.id,
          status: { in: PAID_BOOKING_STATUSES },
        },
        _avg: { totalAmount: true },
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
        take: 8,
      }),
      prisma.booking.findMany({
        where: {
          creatorId: creator.id,
          status: { in: PAID_BOOKING_STATUSES },
          createdAt: { gte: seriesStart },
        },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.order.count({
        where: {
          creatorId: creator.id,
          status: { in: PAID_ORDER_STATUSES },
        },
      }),
      prisma.order.count({
        where: {
          creatorId: creator.id,
          status: { in: PAID_ORDER_STATUSES },
          createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      prisma.order.count({
        where: {
          creatorId: creator.id,
          status: { in: PAID_ORDER_STATUSES },
          createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
      }),
      prisma.orderItem.aggregate({
        where: {
          order: {
            creatorId: creator.id,
            status: { in: PAID_ORDER_STATUSES },
          },
        },
        _sum: { quantity: true },
      }),
      prisma.order.aggregate({
        where: {
          creatorId: creator.id,
          status: { in: PAID_ORDER_STATUSES },
        },
        _avg: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          creatorId: creator.id,
          status: { in: PAID_ORDER_STATUSES },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          creatorId: creator.id,
          status: { in: PAID_ORDER_STATUSES },
          createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          creatorId: creator.id,
          status: { in: PAID_ORDER_STATUSES },
          createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        _sum: { total: true },
      }),
      prisma.order.findMany({
        where: {
          creatorId: creator.id,
          status: { in: PAID_ORDER_STATUSES },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          total: true,
          createdAt: true,
          deliveryAddress: true,
          items: {
            select: {
              quantity: true,
              product: { select: { name: true } },
            },
          },
        },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            creatorId: creator.id,
            status: { in: PAID_ORDER_STATUSES },
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      prisma.order.findMany({
        where: {
          creatorId: creator.id,
          status: { in: PAID_ORDER_STATUSES },
          createdAt: { gte: seriesStart },
        },
        select: { createdAt: true, total: true },
      }),
    ]);

    const serviceIds = bookingsByService
      .map((row) => row.priceListItemId)
      .filter((id): id is string => Boolean(id))
      .slice(0, 5);
    const topBookingServices = bookingsByService
      .filter((row): row is typeof row & { priceListItemId: string } =>
        Boolean(row.priceListItemId)
      )
      .slice(0, 5);
    const productIds = orderItemsByProduct.map((row) => row.productId);

    const [services, products, topProductLines] = await Promise.all([
      serviceIds.length
        ? prisma.priceListItem.findMany({
            where: { id: { in: serviceIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      productIds.length
        ? prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      productIds.length
        ? prisma.orderItem.findMany({
            where: {
              productId: { in: productIds },
              order: {
                creatorId: creator.id,
                status: { in: PAID_ORDER_STATUSES },
              },
            },
            select: {
              productId: true,
              quantity: true,
              unitPrice: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const serviceNameById = new Map(services.map((s) => [s.id, s.name]));
    const productNameById = new Map(products.map((p) => [p.id, p.name]));
    const productRevenueById = new Map<string, number>();
    for (const line of topProductLines) {
      const lineTotal = (line.quantity || 0) * (line.unitPrice || 0);
      productRevenueById.set(
        line.productId,
        (productRevenueById.get(line.productId) || 0) + lineTotal
      );
    }

    const bookingBuckets = buildMonthBuckets(6);
    for (const booking of paidBookingsForSeries) {
      const bucket = bookingBuckets.find(
        (row) => booking.createdAt >= row.start && booking.createdAt <= row.end
      );
      if (!bucket) continue;
      bucket.count += 1;
      bucket.income += creatorShareFromGross(
        Number(booking.totalAmount) || 0,
        feePct
      ).creatorEarnings;
    }

    const shopBuckets = buildMonthBuckets(6);
    for (const order of paidOrdersForSeries) {
      const bucket = shopBuckets.find(
        (row) => order.createdAt >= row.start && order.createdAt <= row.end
      );
      if (!bucket) continue;
      bucket.count += 1;
      bucket.income += creatorShareFromGross(Number(order.total) || 0, feePct)
        .creatorEarnings;
    }

    const shopGrossAll = Number(shopRevenueAll._sum.total || 0);
    const shopGrossCurrent = Number(shopRevenueCurrent._sum.total || 0);
    const shopGrossPrev = Number(shopRevenuePrev._sum.total || 0);

    return NextResponse.json({
      bookings: {
        totalBookings,
        bookingsThisMonth,
        totalEarnings: earnings.totalEarnings,
        upcomingBookings,
        averageBookingValue: Math.round(Number(avgBooking._avg.totalAmount || 0)),
        percentageChanges: {
          bookings: percentageChange(bookingsThisMonth, prevMonthBookings),
          earnings: percentageChange(earnings.currentMonth, earnings.prevMonth),
        },
        monthlySeries: bookingBuckets.map((bucket) => ({
          month: bucket.month,
          income: bucket.income,
          bookings: bucket.count,
        })),
        topServices: topBookingServices.map((row) => ({
          id: row.priceListItemId,
          name: serviceNameById.get(row.priceListItemId) || 'Service',
          bookingCount: Number(row._count?.id || 0),
          revenue: Number(row._sum?.totalAmount || 0),
        })),
        recentBookings: recentBookings.map((booking) => ({
          id: booking.id,
          customerName: booking.customerName,
          bookingDate: booking.bookingDate.toISOString(),
          totalAmount: booking.totalAmount,
          priceListItem: booking.priceListItem,
        })),
      },
      shop: {
        totalOrders,
        ordersThisMonth,
        totalRevenue: creatorShareFromGross(shopGrossAll, feePct).creatorEarnings,
        productsSold: productsSoldAgg._sum.quantity || 0,
        averageOrderValue: Math.round(Number(avgOrder._avg.total || 0)),
        percentageChanges: {
          orders: percentageChange(ordersThisMonth, prevMonthOrders),
          revenue: percentageChange(
            creatorShareFromGross(shopGrossCurrent, feePct).creatorEarnings,
            creatorShareFromGross(shopGrossPrev, feePct).creatorEarnings
          ),
        },
        monthlySeries: shopBuckets.map((bucket) => ({
          month: bucket.month,
          income: bucket.income,
          orders: bucket.count,
        })),
        topProducts: orderItemsByProduct.map((row) => ({
          id: row.productId,
          name: productNameById.get(row.productId) || 'Product',
          unitsSold: row._sum.quantity || 0,
          revenue: productRevenueById.get(row.productId) || 0,
        })),
        recentOrders: recentOrders.map((order) => {
          const itemLabel =
            order.items
              .map((item) => {
                const name = item.product?.name || 'Product';
                return item.quantity > 1 ? `${name} × ${item.quantity}` : name;
              })
              .filter(Boolean)
              .join(', ') || 'Order';
          return {
            id: order.id,
            customerName: customerNameFromAddress(order.deliveryAddress),
            createdAt: order.createdAt.toISOString(),
            totalAmount: order.total,
            itemLabel,
          };
        }),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[creator/analytics] failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: message },
      { status: 500 }
    );
  }
}
