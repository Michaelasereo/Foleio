import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { UnifiedBookingsManager } from '@/components/booking/UnifiedBookingsManager';
import { serializeForClient } from '@/lib/utils';

export default async function BookingsPage() {
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
    console.warn('Bookings page creator lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Booking Management</h1>
        <p className="text-muted-foreground">
          We could not load your booking data right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  if (!creator) {
    redirect('/onboard');
  }

  // Fetch all data needed for the unified booking manager
  let bookings: Awaited<ReturnType<typeof prisma.booking.findMany>> = [];
  let recentBookings: Awaited<ReturnType<typeof prisma.booking.findMany>> = [];
  try {
    [bookings, recentBookings] = await Promise.all([
      // All bookings with full details
      prisma.booking.findMany({
        where: { creatorId: creator.id },
        include: {
          priceListItem: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Recent bookings for overview
      prisma.booking.findMany({
        where: { creatorId: creator.id },
        include: {
          priceListItem: {
            select: {
              name: true,
              price: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);
  } catch {
    console.warn('Bookings page data lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Booking Management</h1>
        <p className="text-muted-foreground">
          We could not load your booking data right now. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  // Separate bookings by status for different tabs
  const upcomingBookings = bookings.filter(
    (b) => ['paid', 'first_payout_done', 'service_day'].includes(b.status)
  );
  const disputedBookings = bookings.filter((b) => b.status === 'disputed');
  const completedBookings = bookings.filter(
    (b) => ['completed', 'refunded', 'cancelled'].includes(b.status)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Booking Management</h1>
        <p className="text-muted-foreground">
          Manage your services, availability, and customer bookings all in one place
        </p>
      </div>

      <UnifiedBookingsManager
        creator={serializeForClient(creator)}
        recentBookings={serializeForClient(recentBookings) as any}
        upcomingBookings={serializeForClient(upcomingBookings) as any}
        disputedBookings={serializeForClient(disputedBookings) as any}
        completedBookings={serializeForClient(completedBookings) as any}
      />
    </div>
  );
}
