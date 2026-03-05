import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getFanSessionFromCookieValue } from '@/lib/fan-auth/session';
import { getFanDashboardData } from '@/lib/fan-auth/data';
import { StatusBadge } from '@/components/fan/StatusBadge';
import { CancelSubscriptionButton } from '@/components/fan/CancelSubscriptionButton';

export default async function FanDashboardSubscriptionsPage() {
  const cookieStore = await cookies();
  const session = getFanSessionFromCookieValue(cookieStore.get('fan_session')?.value);
  if (!session) redirect('/fan/login');

  const data = await getFanDashboardData(session.email);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Your Subscriptions</h1>
      {data.subscriptions.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
          You&apos;re not subscribed to any creators yet.{' '}
          <Link href="/creators" className="text-accent hover:underline">
            Discover creators on Foleio →
          </Link>
        </p>
      ) : (
        data.subscriptions.map((sub) => (
          <div key={sub.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{sub.creator.displayName}</p>
                <p className="text-sm text-muted-foreground">{sub.plan?.name || 'Subscription'}</p>
              </div>
              <StatusBadge status={sub.status} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Next billing date:{' '}
              {sub.nextPaymentDate
                ? new Date(sub.nextPaymentDate).toLocaleDateString()
                : 'N/A'}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={`/creator/${sub.creator.username}`}
                className="inline-flex rounded-md border px-3 py-2 text-sm text-accent hover:bg-accent/10"
              >
                View Creator
              </Link>
              <CancelSubscriptionButton creatorId={sub.creator.id} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
