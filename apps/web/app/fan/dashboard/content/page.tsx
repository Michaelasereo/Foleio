import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getFanSessionFromCookieValue } from '@/lib/fan-auth/session';
import { getFanDashboardData } from '@/lib/fan-auth/data';

export default async function FanContentPage() {
  const cookieStore = await cookies();
  const session = getFanSessionFromCookieValue(cookieStore.get('fan_session')?.value);
  if (!session) redirect('/fan/login');

  const data = await getFanDashboardData(session.email);
  const purchases = [
    ...data.purchases.tutorials.map((item) => ({
      id: item.id,
      title: item.content.title,
      creatorName: item.content.creator.displayName,
      purchasedAt: item.createdAt,
      href: `/creator/${item.content.creator.username}/content/${item.contentId}`,
    })),
    ...data.purchases.collections.map((item) => ({
      id: item.id,
      title: item.collection.title,
      creatorName: item.collection.creator.displayName,
      purchasedAt: item.createdAt,
      href: `/creator/${item.collection.creator.username}/collections/${item.collectionId}`,
    })),
  ].sort((a, b) => +new Date(b.purchasedAt) - +new Date(a.purchasedAt));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Purchased Content</h1>
      {purchases.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
          You haven&apos;t purchased any content yet
        </p>
      ) : (
        purchases.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.creatorName}</p>
              <p className="text-xs text-muted-foreground">
                Purchased {new Date(item.purchasedAt).toLocaleDateString()}
              </p>
            </div>
            <Link href={item.href} className="text-sm font-medium text-accent hover:underline">
              Access Content
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
