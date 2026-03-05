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
      redirect('/onboard');
    }

    const subscriptions = await prisma.platformSubscription.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });

    return (
      <BillingPage
        creator={serializeForClient(creator)}
        currentSubscription={serializeForClient(subscriptions[0] || null)}
        billingHistory={serializeForClient(subscriptions)}
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
