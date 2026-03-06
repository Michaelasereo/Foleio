import { redirect } from 'next/navigation';
import { prisma } from '@foleio/database';
import { createClient } from '@/lib/supabase/server';
import { serializeForClient } from '@/lib/utils';
import { BillingPage } from '@/components/creator/BillingPage';

export default async function CreatorBillingPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  try {
    const creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        displayName: true,
      },
    });

    if (!creator) {
      return (
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">
            Complete your creator setup in Settings before managing billing and
            upgrades.
          </p>
        </div>
      );
    }

    const subscriptions = await prisma.platformSubscription.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });
    const serializedCurrentSubscription = serializeForClient(
      subscriptions[0] || null
    ) as any;
    const serializedBillingHistory = serializeForClient(subscriptions) as any[];

    return (
      <BillingPage
        creator={serializeForClient(creator)}
        currentSubscription={serializedCurrentSubscription}
        billingHistory={serializedBillingHistory}
      />
    );
  } catch {
    console.warn('Billing page data lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          We could not load billing data right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }
}
