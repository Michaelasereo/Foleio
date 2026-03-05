import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getFanSessionFromCookieValue } from '@/lib/fan-auth/session';
import { getFanDashboardData } from '@/lib/fan-auth/data';
import { StatusBadge } from '@/components/fan/StatusBadge';

export default async function FanDashboardPage() {
  const cookieStore = await cookies();
  const session = getFanSessionFromCookieValue(cookieStore.get('fan_session')?.value);
  if (!session) redirect('/fan/login');

  const data = await getFanDashboardData(session.email);
  const upcomingBookings = data.bookings.filter(
    (booking) => !['completed', 'cancelled', 'canceled'].includes(booking.status)
  );

  const purchases = [
    ...data.purchases.tutorials.map((item) => ({
      id: item.id,
      title: item.content.title,
      creatorName: item.content.creator.displayName,
      href: `/creator/${item.content.creator.username}/content/${item.contentId}`,
    })),
    ...data.purchases.collections.map((item) => ({
      id: item.id,
      title: item.collection.title,
      creatorName: item.collection.creator.displayName,
      href: `/creator/${item.collection.creator.username}/collections/${item.collectionId}`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Hey there 👋</h1>
        <p className="text-sm text-muted-foreground">{session.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-semibold">{data.subscriptions.length}</p>
          <p className="text-xs text-muted-foreground">Subscriptions</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-semibold">{data.bookings.length}</p>
          <p className="text-xs text-muted-foreground">Bookings</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-semibold">{purchases.length}</p>
          <p className="text-xs text-muted-foreground">Purchases</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Upcoming Bookings</h2>
        {upcomingBookings.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            No upcoming bookings
          </p>
        ) : (
          upcomingBookings.slice(0, 4).map((booking) => (
            <div key={booking.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{booking.priceListItem.name}</p>
                <StatusBadge status={booking.status} />
              </div>
              <p className="text-sm text-muted-foreground">{booking.creator.displayName}</p>
              <div className="mt-3">
                <Link
                  className="text-sm font-medium text-accent hover:underline"
                  href={`/tracking/${booking.trackingToken}`}
                >
                  Track
                </Link>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Your Subscriptions</h2>
        {data.subscriptions.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            No active subscriptions
          </p>
        ) : (
          data.subscriptions.slice(0, 4).map((sub) => (
            <div key={sub.id} className="rounded-xl border bg-card p-4">
              <p className="font-medium">{sub.creator.displayName}</p>
              <p className="text-sm text-muted-foreground">
                {sub.plan?.name || 'Subscription Plan'}
              </p>
              <p className="text-xs text-muted-foreground">
                Next billing: {sub.nextPaymentDate ? new Date(sub.nextPaymentDate).toLocaleDateString() : 'N/A'}
              </p>
              <div className="mt-2">
                <Link
                  href={`/creator/${sub.creator.username}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  View Content
                </Link>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Purchased Content</h2>
        {purchases.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            No purchased content yet
          </p>
        ) : (
          purchases.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-xl border bg-card p-4">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.creatorName}</p>
              <div className="mt-2">
                <Link href={item.href} className="text-sm font-medium text-accent hover:underline">
                  Access
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
