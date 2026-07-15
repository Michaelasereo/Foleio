import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { serializeForClient } from '@/lib/utils';
import {
  formatBalanceDueDate,
  getBookingBalanceDueDate,
} from '@/lib/booking/deposit';
import {
  bookingMatchesFilter,
  type BookingStatusFilter,
  type CreatorBookingRow,
} from '@/lib/booking/status';

export async function requireCreatorForBookings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      displayName: true,
      username: true,
      category: true,
      balanceDueDaysBefore: true,
    },
  });

  if (!creator) {
    return null;
  }

  return serializeForClient(creator) as {
    id: string;
    displayName: string;
    username: string;
    category: string;
    balanceDueDaysBefore: number;
  };
}

function withBalanceDueLabel(
  booking: {
    bookingDate: Date | string;
    paymentPlan?: string | null;
    balanceAmount?: number | null;
  },
  balanceDueDaysBefore: number
): string | null {
  if (booking.paymentPlan !== 'deposit' || !(booking.balanceAmount && booking.balanceAmount > 0)) {
    return null;
  }
  const due = getBookingBalanceDueDate(
    new Date(booking.bookingDate),
    balanceDueDaysBefore ?? 7
  );
  return formatBalanceDueDate(due);
}

export async function loadCreatorBookingsByStatus(
  creatorId: string,
  filter: BookingStatusFilter
): Promise<CreatorBookingRow[]> {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { balanceDueDaysBefore: true },
  });
  const daysBefore = creator?.balanceDueDaysBefore ?? 7;

  const bookings = await prisma.booking.findMany({
    where: { creatorId },
    include: { priceListItem: true },
    orderBy: { bookingDate: 'desc' },
  });

  const filtered = bookings.filter((b) => bookingMatchesFilter(b.status, filter));

  return serializeForClient(
    filtered.map((b) => ({
      ...b,
      balanceDueDateLabel: withBalanceDueLabel(b, daysBefore),
    }))
  ) as unknown as CreatorBookingRow[];
}

export async function loadCreatorBookingById(
  creatorId: string,
  bookingId: string
): Promise<CreatorBookingRow | null> {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { balanceDueDaysBefore: true },
  });
  const daysBefore = creator?.balanceDueDaysBefore ?? 7;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, creatorId },
    include: { priceListItem: true },
  });

  if (!booking) return null;
  return serializeForClient({
    ...booking,
    balanceDueDateLabel: withBalanceDueLabel(booking, daysBefore),
  }) as unknown as CreatorBookingRow;
}
