import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { prisma } from '@foleio/database';
import { UnifiedBookingsManager } from '@/components/booking/UnifiedBookingsManager';
import { serializeForClient } from '@/lib/utils';
import {
  formatBalanceDueDate,
  getBookingBalanceDueDate,
} from '@/lib/booking/deposit';
import { getCreatorForUser, getCurrentUser } from '@/lib/creator/cached-lookups';
import BookingsLoading from './loading';

const UPCOMING_STATUSES = [
  'deposit_paid',
  'balance_overdue',
  'paid',
  'first_payout_done',
  'service_day',
] as const;

const COMPLETED_STATUSES = ['completed', 'refunded', 'cancelled'] as const;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = (await searchParams) || {};
  if (params.tab === 'portfolio') {
    redirect('/settings?tab=portfolio');
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  let creator: Awaited<ReturnType<typeof getCreatorForUser>> = null;
  try {
    creator = await getCreatorForUser(user.id);
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

  let upcomingBookingsRaw: Awaited<ReturnType<typeof prisma.booking.findMany>> = [];
  let disputedBookingsRaw: Awaited<ReturnType<typeof prisma.booking.findMany>> = [];
  let completedBookingsRaw: Awaited<ReturnType<typeof prisma.booking.findMany>> = [];
  let availability: Awaited<ReturnType<typeof prisma.creatorAvailability.findMany>> =
    [];
  let priceList: Awaited<ReturnType<typeof prisma.priceListItem.findMany>> = [];
  try {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const bookingInclude = { priceListItem: true } as const;

    [
      upcomingBookingsRaw,
      disputedBookingsRaw,
      completedBookingsRaw,
      availability,
      priceList,
    ] = await Promise.all([
      prisma.booking.findMany({
        where: {
          creatorId: creator.id,
          status: { in: [...UPCOMING_STATUSES] },
        },
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.booking.findMany({
        where: {
          creatorId: creator.id,
          status: 'disputed',
        },
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.booking.findMany({
        where: {
          creatorId: creator.id,
          status: { in: [...COMPLETED_STATUSES] },
        },
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
        take: 100,
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

  const daysBefore = creator.balanceDueDaysBefore ?? 7;
  const withDue = <
    T extends {
      paymentPlan?: string | null;
      balanceAmount?: number | null;
      bookingDate: Date | string;
    },
  >(
    list: T[]
  ) =>
    list.map((b) => ({
      ...b,
      balanceDueDateLabel:
        b.paymentPlan === 'deposit' && b.balanceAmount && b.balanceAmount > 0
          ? formatBalanceDueDate(
              getBookingBalanceDueDate(new Date(b.bookingDate), daysBefore)
            )
          : null,
    }));

  const upcomingBookings = withDue(upcomingBookingsRaw);
  const disputedBookings = withDue(disputedBookingsRaw);
  const completedBookings = withDue(completedBookingsRaw);

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
