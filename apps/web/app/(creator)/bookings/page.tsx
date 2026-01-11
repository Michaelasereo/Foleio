import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@odim/database';
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

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
  });

  if (!creator) {
    redirect('/onboard');
  }

  // Fetch all data needed for the unified booking manager
  const [bookings, recentBookings] = await Promise.all([
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
            price: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

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
        recentBookings={serializeForClient(recentBookings)}
        upcomingBookings={serializeForClient(upcomingBookings)}
        disputedBookings={serializeForClient(disputedBookings)}
        completedBookings={serializeForClient(completedBookings)}
      />
    </div>
  );
}
