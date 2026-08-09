import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookingDetailClient } from '@/components/booking/BookingDetailClient';
import {
  loadCreatorBookingById,
  requireCreatorForBookings,
} from '@/lib/booking/load-creator-bookings';
import {
  bookingMatchesFilter,
  type BookingStatusFilter,
} from '@/lib/booking/status';

function backHrefForBooking(status: string): string {
  const filters: BookingStatusFilter[] = ['upcoming', 'disputed', 'completed'];
  for (const filter of filters) {
    if (bookingMatchesFilter(status, filter)) {
      return `/bookings/${filter}`;
    }
  }
  return '/bookings';
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creator = await requireCreatorForBookings();

  if (!creator) {
    return (
      <div>
        <h1 className="foleio-auth-title">Booking details</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          Finish setting up your creator profile in Settings to manage bookings.
        </p>
        <Link href="/settings" className="foleio-dash-btn-outline" style={{ marginTop: 16 }}>
          Go to settings
        </Link>
      </div>
    );
  }

  let booking = null;
  try {
    booking = await loadCreatorBookingById(creator.id, id);
  } catch {
    return (
      <div>
        <h1 className="foleio-auth-title">Booking details</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          We could not load this booking right now. Please try again.
        </p>
        <Link href="/bookings" className="foleio-dash-btn-ghost" style={{ marginTop: 16 }}>
          Back to bookings
        </Link>
      </div>
    );
  }

  if (!booking) {
    notFound();
  }

  return (
    <BookingDetailClient
      booking={booking}
      backHref={backHrefForBooking(booking.status)}
    />
  );
}
