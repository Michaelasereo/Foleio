import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SUCCESS = ['SUCCESS', 'COMPLETED', 'PAID', 'success', 'completed', 'paid'];

async function main() {
  const creators = await prisma.creator.count();
  const users = await prisma.user.count();
  const bookings = await prisma.booking.count();
  const paidBookings = await prisma.booking.count({
    where: {
      status: {
        in: [
          'paid',
          'first_payout_done',
          'service_day',
          'completed',
          'deposit_paid',
          'balance_overdue',
        ],
      },
    },
  });
  const pendingBookings = await prisma.booking.count({
    where: { status: 'pending' },
  });
  const orders = await prisma.order.count();
  const confirmedOrders = await prisma.order.count({
    where: {
      status: {
        in: ['confirmed', 'processing', 'delivered', 'in_progress', 'shipped'],
      },
    },
  });
  const ordersGMV = await prisma.order.aggregate({
    where: {
      status: {
        in: ['confirmed', 'processing', 'delivered', 'in_progress', 'shipped'],
      },
    },
    _sum: { total: true },
  });
  const txs = await prisma.transaction.count({
    where: { status: { in: SUCCESS } },
  });
  const txAgg = await prisma.transaction.aggregate({
    where: { status: { in: SUCCESS } },
    _sum: { amount: true, platformFee: true, creatorEarnings: true },
  });
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const tx30 = await prisma.transaction.aggregate({
    where: { status: { in: SUCCESS }, createdAt: { gte: last30 } },
    _sum: { amount: true, platformFee: true, creatorEarnings: true },
    _count: true,
  });
  const activeSubs = await prisma.platformSubscription.count({
    where: { status: { in: ['active', 'trialing'] } },
  });
  const mrr = await prisma.platformSubscription.aggregate({
    where: { status: { in: ['active', 'trialing'] } },
    _sum: { amount: true },
  });
  let waitlist = 0;
  try {
    waitlist = await prisma.waitlistEntry.count({ where: { status: 'pending' } });
  } catch {
    waitlist = 0;
  }
  const products = await prisma.product.count();
  const services = await prisma.priceListItem.count();
  const reviews = await prisma.creatorReview.count();
  const paymentsReady = await prisma.creator.count({
    where: {
      paystackSubaccountCode: { not: null },
      subaccountStatus: 'ACTIVE',
    },
  });
  const byPlan = await prisma.creator.groupBy({
    by: ['platformPlan'],
    _count: true,
  });
  const byTxType = await prisma.transaction.groupBy({
    by: ['type'],
    where: { status: { in: SUCCESS } },
    _count: true,
    _sum: { amount: true, platformFee: true, creatorEarnings: true },
  });
  const bookingGMV = await prisma.booking.aggregate({
    where: {
      status: {
        in: [
          'paid',
          'first_payout_done',
          'service_day',
          'completed',
          'deposit_paid',
          'balance_overdue',
        ],
      },
    },
    _sum: { amountPaid: true, totalAmount: true },
  });

  const n = (v: unknown) => (v == null ? 0 : Number(v));

  console.log(
    JSON.stringify(
      {
        asOf: new Date().toISOString(),
        creators,
        users,
        paymentsReady,
        byPlan,
        bookings: {
          total: bookings,
          paidOrDeposit: paidBookings,
          pending: pendingBookings,
          amountPaidKobo: n(bookingGMV._sum.amountPaid),
          totalAmountKobo: n(bookingGMV._sum.totalAmount),
        },
        orders: {
          total: orders,
          confirmedish: confirmedOrders,
          gmvKobo: n(ordersGMV._sum.total),
        },
        ledger: {
          successTxCount: txs,
          gmvKobo: n(txAgg._sum.amount),
          platformFeeKobo: n(txAgg._sum.platformFee),
          creatorEarningsKobo: n(txAgg._sum.creatorEarnings),
        },
        last30d: {
          txCount: Number(tx30._count),
          gmvKobo: n(tx30._sum.amount),
          platformFeeKobo: n(tx30._sum.platformFee),
          creatorEarningsKobo: n(tx30._sum.creatorEarnings),
        },
        platformSubs: { active: activeSubs, mrrKobo: n(mrr._sum.amount) },
        waitlistPending: waitlist,
        catalog: { products, services, reviews },
        byTxType: byTxType.map((row) => ({
          type: row.type,
          count: row._count,
          amountKobo: n(row._sum.amount),
          platformFeeKobo: n(row._sum.platformFee),
          creatorEarningsKobo: n(row._sum.creatorEarnings),
        })),
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
