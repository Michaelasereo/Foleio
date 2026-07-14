import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { UnifiedBookingsManager } from '@/components/booking/UnifiedBookingsManager';
import { serializeForClient } from '@/lib/utils';
import BookingsLoading from './loading';

export default async function BookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = (await searchParams) || {};
  if (params.tab === 'portfolio') {
    redirect('/settings?tab=portfolio');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let creator: Awaited<ReturnType<typeof prisma.creator.findUnique>> = null;
  try {
    creator = await prisma.creator.findUnique({
      where: { userId: user.id },
    });
  } catch {
    console.warn('Bookings page creator lookup failed (non-fatal).');
    return (
      <div>
        <h1 className="foleio-auth-title">Bookings</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          We could not load your booking data right now. Please try again in a moment.
        </p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div>
        <h1 className="foleio-auth-title">Bookings</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          Finish setting up your creator profile in Settings to manage bookings.
        </p>
      </div>
    );
  }

  let bookings: Awaited<ReturnType<typeof prisma.booking.findMany>> = [];
  let availability: Awaited<ReturnType<typeof prisma.creatorAvailability.findMany>> =
    [];
  let priceList: Awaited<ReturnType<typeof prisma.priceListItem.findMany>> = [];
  try {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    [bookings, availability, priceList] = await Promise.all([
      prisma.booking.findMany({
        where: { creatorId: creator.id },
        include: {
          priceListItem: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.creatorAvailability.findMany({
        where: {
          creatorId: creator.id,
          date: {
            gte: new Date(),
            lte: ninetyDaysFromNow,
          },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.priceListItem.findMany({
        where: { creatorId: creator.id },
        orderBy: [{ categoryOrderIndex: 'asc' }, { orderIndex: 'asc' }],
      }),
    ]);
  } catch {
    console.warn('Bookings page data lookup failed (non-fatal).');
    return (
      <div>
        <h1 className="foleio-auth-title">Bookings</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          We could not load your booking data right now. Please try again in a moment.
        </p>
      </div>
    );
  }

  const upcomingBookings = bookings.filter((b) =>
    ['paid', 'first_payout_done', 'service_day'].includes(b.status)
  );
  const disputedBookings = bookings.filter((b) => b.status === 'disputed');
  const completedBookings = bookings.filter((b) =>
    ['completed', 'refunded', 'cancelled'].includes(b.status)
  );

  return (
    <Suspense fallback={<BookingsLoading />}>
      <UnifiedBookingsManager
        creator={serializeForClient(creator)}
        upcomingBookings={serializeForClient(upcomingBookings) as any}
        disputedBookings={serializeForClient(disputedBookings) as any}
        completedBookings={serializeForClient(completedBookings) as any}
        availability={serializeForClient(availability) as any}
        priceList={serializeForClient(priceList) as any}
      />
    </Suspense>
  );
}
