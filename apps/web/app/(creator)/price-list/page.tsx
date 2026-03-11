import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { PriceListManager } from '@/components/creator/PriceListManager';

export default async function PriceListPage() {
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
    });

    if (!creator) {
      return (
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground">
            Finish setting up your creator profile in Settings to manage your
            services.
          </p>
        </div>
      );
    }

    const priceListItems = await prisma.priceListItem.findMany({
      where: { creatorId: creator.id },
      orderBy: [{ categoryOrderIndex: 'asc' }, { orderIndex: 'asc' }],
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground">
            Manage your service offerings and pricing for bookings
          </p>
        </div>

        <PriceListManager
          creatorId={creator.id}
          initialPriceList={priceListItems}
        />
      </div>
    );
  } catch {
    // Avoid hard-crashing the route when DB is temporarily unavailable.
    console.warn('Services page data lookup failed (non-fatal).');

    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Services</h1>
        <p className="text-muted-foreground">
          We could not load your services right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }
}

