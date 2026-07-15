import { prisma } from '@foleio/database';
import {
  BALANCE_EMAIL_TYPES,
  formatBalanceDueDate,
  getBalanceReminderKind,
  getBookingBalanceDueDate,
} from '@/lib/booking/deposit';
import { formatBookingWhen } from '@/lib/booking/slots';
import {
  sendBalanceOverdueCreatorEmail,
  sendBalanceReminderEmail,
} from '@/lib/email/send';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';
const BATCH_SIZE = 100;

async function alreadySent(bookingId: string, emailType: string) {
  const existing = await prisma.bookingEmailLog.findUnique({
    where: {
      bookingId_emailType: { bookingId, emailType },
    },
  });
  return Boolean(existing);
}

async function markSent(bookingId: string, emailType: string) {
  await prisma.bookingEmailLog.create({
    data: { bookingId, emailType },
  });
}

/**
 * Daily job: balance reminders (due−2, due day, due+1) and overdue flagging.
 * Schedule for ~08:00 WAT via Netlify.
 */
export async function processBalanceReminders(now: Date = new Date()) {
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['deposit_paid', 'balance_overdue'] },
      balanceAmount: { gt: 0 },
      paymentPlan: 'deposit',
    },
    include: {
      priceListItem: { select: { name: true } },
      creator: {
        select: {
          displayName: true,
          username: true,
          balanceDueDaysBefore: true,
          user: { select: { email: true } },
        },
      },
    },
    take: BATCH_SIZE,
    orderBy: { bookingDate: 'asc' },
  });

  let remindersSent = 0;
  let overdueFlagged = 0;
  let creatorAlertsSent = 0;
  let skipped = 0;

  for (const booking of bookings) {
    const due = getBookingBalanceDueDate(
      booking.bookingDate,
      booking.creator.balanceDueDaysBefore ?? 7
    );
    const kind = getBalanceReminderKind(now, due);
    if (!kind) {
      skipped += 1;
      continue;
    }

    const bookingDateLabel = formatBookingWhen(
      booking.bookingDate,
      booking.startTime,
      booking.endTime
    );
    const dueLabel = formatBalanceDueDate(due);
    const trackingUrl = `${APP_URL}/tracking/${booking.trackingToken}`;
    const bookingUrl = `${APP_URL}/bookings/detail/${booking.id}`;
    const balanceNaira = booking.balanceAmount / 100;
    const emailType = BALANCE_EMAIL_TYPES[kind];

    if (!(await alreadySent(booking.id, emailType))) {
      const sent = await sendBalanceReminderEmail({
        customerEmail: booking.customerEmail,
        customerName: booking.customerName,
        creatorName: booking.creator.displayName,
        serviceName: booking.priceListItem.name,
        bookingDate: bookingDateLabel,
        balanceAmount: balanceNaira,
        balanceDueDateLabel: dueLabel,
        trackingUrl,
        kind,
      });
      if (sent.success) {
        await markSent(booking.id, emailType);
        remindersSent += 1;
      }
    }

    if (kind === 'reminder_overdue') {
      if (booking.status === 'deposit_paid') {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'balance_overdue' },
        });
        overdueFlagged += 1;
      }

      const creatorEmail = booking.creator.user?.email;
      const creatorType = BALANCE_EMAIL_TYPES.overdue_creator;
      if (creatorEmail && !(await alreadySent(booking.id, creatorType))) {
        const creatorSent = await sendBalanceOverdueCreatorEmail({
          creatorEmail,
          creatorName: booking.creator.displayName,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          serviceName: booking.priceListItem.name,
          bookingDate: bookingDateLabel,
          balanceAmount: balanceNaira,
          balanceDueDateLabel: dueLabel,
          bookingUrl,
        });
        if (creatorSent.success) {
          await markSent(booking.id, creatorType);
          creatorAlertsSent += 1;
        }
      }
    }
  }

  return {
    checked: bookings.length,
    remindersSent,
    overdueFlagged,
    creatorAlertsSent,
    skipped,
  };
}
