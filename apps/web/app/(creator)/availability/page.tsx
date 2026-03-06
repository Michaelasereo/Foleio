import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { AvailabilityManager } from '@/components/booking/AvailabilityManager';
import { serializeForClient } from '@/lib/utils';

export default async function AvailabilityPage() {
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
    console.warn('Availability page creator lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Availability Calendar</h1>
        <p className="text-muted-foreground">
          We could not load your availability data right now. Please try again
          in a moment.
        </p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Availability Calendar</h1>
        <p className="text-muted-foreground">
          Finish setting up your creator profile in Settings to manage
          availability.
        </p>
      </div>
    );
  }

  // Get availability for next 90 days for better planning
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

  let availability: Awaited<
    ReturnType<typeof prisma.creatorAvailability.findMany>
  > = [];
  try {
    availability = await prisma.creatorAvailability.findMany({
      where: {
        creatorId: creator.id,
        date: {
          gte: new Date(),
          lte: ninetyDaysFromNow,
        },
      },
      orderBy: { date: 'asc' },
    });
  } catch {
    console.warn('Availability page data lookup failed (non-fatal).');
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Availability Calendar</h1>
        <p className="text-muted-foreground">
          We could not load your availability data right now. Please try again
          in a moment.
        </p>
      </div>
    );
  }

  console.log(`Server: Found ${availability.length} availability records for creator ${creator.id}:`,
    availability.map(a => ({ date: a.date.toISOString(), isAvailable: a.isAvailable })));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Availability Calendar</h1>
          <p className="text-muted-foreground">
            Set your working hours and manage when clients can book with you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Unavailable</span>
          </div>
        </div>
      </div>

      <AvailabilityManager 
        creatorId={creator.id} 
        availability={serializeForClient(availability) as any} 
      />
    </div>
  );
}
