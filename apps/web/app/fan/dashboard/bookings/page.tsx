import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getFanSessionFromCookieValue } from '@/lib/fan-auth/session';
import { getFanDashboardData } from '@/lib/fan-auth/data';
import { StatusBadge } from '@/components/fan/StatusBadge';

export default async function FanBookingsPage() {
  const cookieStore = await cookies();
  const session = getFanSessionFromCookieValue(cookieStore.get('fan_session')?.value);
  if (!session) redirect('/fan/login');

  const data = await getFanDashboardData(session.email);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">All Bookings</h1>
      {data.bookings.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
          No bookings yet
        </p>
      ) : (
        data.bookings.map((booking) => (
          <div
            key={booking.id}
            className="grid gap-2 rounded-xl border bg-card p-4 md:grid-cols-5 md:items-center"
          >
            <div>
              <p className="font-medium">{booking.priceListItem.name}</p>
              <p className="text-sm text-muted-foreground">{booking.creator.displayName}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(booking.bookingDate).toLocaleDateString()}
            </p>
            <div>
              <StatusBadge status={booking.status} />
            </div>
            <div>
              <Link
                href={`/tracking/${booking.trackingToken}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                Track
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
