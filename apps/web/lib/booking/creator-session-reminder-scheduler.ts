import { prisma } from '@foleio/database';
import { formatBookingWhen } from '@/lib/booking/slots';
import { sendCreatorSessionReminderEmail } from '@/lib/email/send';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';
const BATCH_SIZE = 100;
export const CREATOR_SESSION_REMINDER_EMAIL_TYPE = 'creator_session_reminder_1d';

const UPCOMING_STATUSES = [
  'deposit_paid',
  'balance_overdue',
  'paid',
  'first_payout_done',
  'service_day',
] as const;

function lagosYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Add calendar days to a YYYY-MM-DD string (UTC-safe for date-only). */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function tomorrowYmdInLagos(now: Date = new Date()): string {
  return addDaysYmd(lagosYmd(now), 1);
}

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
 * Daily job: email creators one day before each upcoming session (WAT calendar).
 * Schedule for ~08:00 WAT via Netlify.
 */
export async function processCreatorSessionReminders(now: Date = new Date()) {
  const tomorrowYmd = tomorrowYmdInLagos(now);
  const bookingDate = new Date(`${tomorrowYmd}T00:00:00.000Z`);

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: [...UPCOMING_STATUSES] },
      bookingDate,
    },
    include: {
      priceListItem: { select: { name: true } },
      creator: {
        select: {
          displayName: true,
          user: { select: { email: true } },
        },
      },
    },
    take: BATCH_SIZE,
    orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
  });

  let remindersSent = 0;
  let skipped = 0;
  let failed = 0;

  for (const booking of bookings) {
    const creatorEmail = booking.creator.user?.email?.trim();
    if (!creatorEmail) {
      skipped += 1;
      continue;
    }

    if (await alreadySent(booking.id, CREATOR_SESSION_REMINDER_EMAIL_TYPE)) {
      skipped += 1;
      continue;
    }

    const bookingDateLabel = formatBookingWhen(
      booking.bookingDate,
      booking.startTime,
      booking.endTime
    );
    const bookingUrl = `${APP_URL.replace(/\/$/, '')}/bookings/detail/${booking.id}`;

    const sent = await sendCreatorSessionReminderEmail({
      creatorEmail,
      creatorName: booking.creator.displayName,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      serviceName: booking.priceListItem.name,
      bookingDate: bookingDateLabel,
      bookingUrl,
    });

    if (sent.success) {
      await markSent(booking.id, CREATOR_SESSION_REMINDER_EMAIL_TYPE);
      remindersSent += 1;
    } else {
      failed += 1;
    }
  }

  return {
    tomorrowYmd,
    checked: bookings.length,
    remindersSent,
    skipped,
    failed,
  };
}
