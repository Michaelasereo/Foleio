import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { serializeForClient } from '@/lib/utils';
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
  };
}

export async function loadCreatorBookingsByStatus(
  creatorId: string,
  filter: BookingStatusFilter
): Promise<CreatorBookingRow[]> {
  const bookings = await prisma.booking.findMany({
    where: { creatorId },
    include: { priceListItem: true },
    orderBy: { bookingDate: 'desc' },
  });

  return serializeForClient(
    bookings.filter((b) => bookingMatchesFilter(b.status, filter))
  ) as CreatorBookingRow[];
}

export async function loadCreatorBookingById(
  creatorId: string,
  bookingId: string
): Promise<CreatorBookingRow | null> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, creatorId },
    include: { priceListItem: true },
  });

  if (!booking) return null;
  return serializeForClient(booking) as CreatorBookingRow;
}
