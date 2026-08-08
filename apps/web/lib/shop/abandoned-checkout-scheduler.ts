import { prisma } from '@foleio/database';
import {
  sendAbandonedBookingCheckoutEmail,
  sendAbandonedShopCheckoutEmail,
} from '@/lib/email/send';

export const ABANDONED_CHECKOUT_EMAIL_TYPE = 'abandoned_checkout_1h';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';
const BATCH_SIZE = 100;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

function windowBounds(now: Date) {
  return {
    reminderOlderThan: new Date(now.getTime() - ONE_HOUR_MS),
    reminderNewerThan: new Date(now.getTime() - ONE_DAY_MS),
    expireBefore: new Date(now.getTime() - ONE_DAY_MS),
  };
}

async function bookingAlreadySent(bookingId: string) {
  const existing = await prisma.bookingEmailLog.findUnique({
    where: {
      bookingId_emailType: {
        bookingId,
        emailType: ABANDONED_CHECKOUT_EMAIL_TYPE,
      },
    },
  });
  return Boolean(existing);
}

async function orderAlreadySent(orderId: string) {
  const existing = await prisma.orderEmailLog.findUnique({
    where: {
      orderId_emailType: {
        orderId,
        emailType: ABANDONED_CHECKOUT_EMAIL_TYPE,
      },
    },
  });
  return Boolean(existing);
}

function amountDueKobo(booking: {
  paymentPlan: string;
  depositAmount: number;
  totalAmount: number;
}) {
  if (booking.paymentPlan === 'deposit' && booking.depositAmount > 0) {
    return booking.depositAmount;
  }
  return booking.totalAmount;
}

function orderCustomer(order: { deliveryAddress: unknown }) {
  const address = (order.deliveryAddress || {}) as Record<string, unknown>;
  const firstName = String(address.firstName || address.first_name || '').trim();
  const lastName = String(address.lastName || address.last_name || '').trim();
  const name =
    `${firstName} ${lastName}`.trim() || String(address.name || '').trim() || 'there';
  const email = String(address.email || '').trim();
  return { name, email };
}

function orderItemSummary(
  items: Array<{ quantity: number; product: { name: string } | null }>
) {
  return items
    .map((item) => {
      const name = item.product?.name || 'Item';
      return item.quantity > 1 ? `${name} ×${item.quantity}` : name;
    })
    .join(', ');
}

/**
 * Hourly job: 1h abandoned-checkout reminder + 24h auto-cancel for pending
 * bookings and shop orders.
 */
export async function processAbandonedCheckouts(now: Date = new Date()) {
  const { reminderOlderThan, reminderNewerThan, expireBefore } = windowBounds(now);

  let bookingRemindersSent = 0;
  let orderRemindersSent = 0;
  let bookingsCancelled = 0;
  let ordersCancelled = 0;

  const pendingBookings = await prisma.booking.findMany({
    where: {
      status: 'pending',
      createdAt: {
        lte: reminderOlderThan,
        gte: reminderNewerThan,
      },
    },
    include: {
      priceListItem: { select: { name: true } },
      creator: { select: { displayName: true } },
    },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
  });

  for (const booking of pendingBookings) {
    if (await bookingAlreadySent(booking.id)) continue;

    const amountKobo = amountDueKobo(booking);
    const sent = await sendAbandonedBookingCheckoutEmail({
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      creatorName: booking.creator.displayName,
      serviceName: booking.priceListItem.name,
      amountNaira: amountKobo / 100,
      resumeUrl: `${APP_URL}/tracking/${booking.trackingToken}`,
    });
    if (sent.success) {
      await prisma.bookingEmailLog.create({
        data: {
          bookingId: booking.id,
          emailType: ABANDONED_CHECKOUT_EMAIL_TYPE,
        },
      });
      bookingRemindersSent += 1;
    }
  }

  const pendingOrders = await prisma.order.findMany({
    where: {
      status: 'pending',
      createdAt: {
        lte: reminderOlderThan,
        gte: reminderNewerThan,
      },
    },
    include: {
      creator: { select: { displayName: true } },
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
  });

  for (const order of pendingOrders) {
    if (await orderAlreadySent(order.id)) continue;

    const { name, email } = orderCustomer(order);
    if (!email) continue;

    const sent = await sendAbandonedShopCheckoutEmail({
      customerEmail: email,
      customerName: name,
      creatorName: order.creator.displayName,
      itemSummary: orderItemSummary(order.items) || 'Your cart',
      amountNaira: order.total / 100,
      resumeUrl: `${APP_URL}/shop/pay/${order.id}`,
    });
    if (sent.success) {
      await prisma.orderEmailLog.create({
        data: {
          orderId: order.id,
          emailType: ABANDONED_CHECKOUT_EMAIL_TYPE,
        },
      });
      orderRemindersSent += 1;
    }
  }

  const expiredBookings = await prisma.booking.updateMany({
    where: {
      status: 'pending',
      createdAt: { lt: expireBefore },
    },
    data: { status: 'cancelled' },
  });
  bookingsCancelled = expiredBookings.count;

  const expiredOrders = await prisma.order.updateMany({
    where: {
      status: 'pending',
      createdAt: { lt: expireBefore },
    },
    data: { status: 'cancelled' },
  });
  ordersCancelled = expiredOrders.count;

  return {
    bookingRemindersSent,
    orderRemindersSent,
    bookingsCancelled,
    ordersCancelled,
    bookingsChecked: pendingBookings.length,
    ordersChecked: pendingOrders.length,
  };
}
