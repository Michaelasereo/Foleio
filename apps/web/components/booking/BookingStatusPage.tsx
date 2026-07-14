import Link from 'next/link';
import { BookingStatusList } from '@/components/booking/BookingStatusList';
import {
  loadCreatorBookingsByStatus,
  requireCreatorForBookings,
} from '@/lib/booking/load-creator-bookings';
import type { BookingStatusFilter } from '@/lib/booking/status';

export default async function BookingStatusPage({
  status,
}: {
  status: BookingStatusFilter;
}) {
  const creator = await requireCreatorForBookings();

  if (!creator) {
    return (
      <div>
        <h1 className="foleio-auth-title">Bookings</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          Finish setting up your creator profile in Settings to manage bookings.
        </p>
        <Link href="/settings" className="foleio-dash-btn-outline" style={{ marginTop: 16 }}>
          Go to settings
        </Link>
      </div>
    );
  }

  let bookings = [];
  try {
    bookings = await loadCreatorBookingsByStatus(creator.id, status);
  } catch {
    return (
      <div>
        <h1 className="foleio-auth-title">Bookings</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          We could not load bookings right now. Please try again in a moment.
        </p>
        <Link href="/bookings" className="foleio-dash-btn-ghost" style={{ marginTop: 16 }}>
          Back to bookings
        </Link>
      </div>
    );
  }

  return <BookingStatusList status={status} bookings={bookings} />;
}
