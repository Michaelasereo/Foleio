import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { PayoutPage } from '@/components/creator/PayoutPage';

export default async function PayoutsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  let creator: Awaited<ReturnType<typeof prisma.creator.findUnique>> = null;
  try {
    creator = await prisma.creator.findUnique({
      where: { userId: session.user.id },
    });
  } catch {
    console.warn('Payouts page creator lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Payouts</h1>
        <p className="text-muted-foreground">
          We could not load your payout data right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  if (!creator) {
    redirect('/onboard');
  }

  let payouts: Awaited<ReturnType<typeof prisma.payout.findMany>> = [];
  try {
    payouts = await prisma.payout.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  } catch {
    console.warn('Payouts page data lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Payouts</h1>
        <p className="text-muted-foreground">
          We could not load your payout data right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  return <PayoutPage creator={creator} payouts={payouts} />;
}

