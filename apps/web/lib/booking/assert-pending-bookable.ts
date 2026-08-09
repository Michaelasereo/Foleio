import { prisma } from '@foleio/database';
import { dayBookingCapacity } from '@/lib/booking/day-capacity';
import { isSlotOpen, isValidHHmm } from '@/lib/booking/slots';

const SLOT_GONE_MESSAGE =
  'That time is no longer available — please book again.';

/**
 * Re-validate that a pending booking can still be paid for.
 * Excludes this booking from conflict counts (it already holds the slot).
 * On failure, cancels the pending booking so the slot is released.
 */
export async function assertPendingBookingStillBookable(booking: {
  id: string;
  creatorId: string;
  bookingDate: Date;
  startTime: string | null;
  endTime: string | null;
  source?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // Quote-origin bookings skip calendar slot / capacity checks
  if (booking.source === 'quote') {
    return { ok: true };
  }

  const dateOnly = new Date(booking.bookingDate);
  dateOnly.setUTCHours(0, 0, 0, 0);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (dateOnly.getTime() < today.getTime()) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });
    return { ok: false, error: SLOT_GONE_MESSAGE };
  }

  const availability = await prisma.creatorAvailability.findUnique({
    where: {
      creatorId_date: {
        creatorId: booking.creatorId,
        date: dateOnly,
      },
    },
    include: {
      slots: { where: { isActive: true } },
    },
  });

  if (!availability || !availability.isAvailable) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });
    return { ok: false, error: SLOT_GONE_MESSAGE };
  }

  const mode = availability.mode === 'hours' ? 'hours' : 'full_day';

  if (mode === 'hours') {
    const startTime = booking.startTime;
    const endTime = booking.endTime;
    if (
      !startTime ||
      !endTime ||
      !isValidHHmm(startTime) ||
      !isValidHHmm(endTime)
    ) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'cancelled' },
      });
      return { ok: false, error: SLOT_GONE_MESSAGE };
    }

    const matchingSlot = availability.slots.find(
      (slot) => slot.startTime === startTime && slot.endTime === endTime
    );
    if (!matchingSlot) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'cancelled' },
      });
      return { ok: false, error: SLOT_GONE_MESSAGE };
    }

    const timedBookings = await prisma.booking.findMany({
      where: {
        creatorId: booking.creatorId,
        bookingDate: dateOnly,
        id: { not: booking.id },
        status: { notIn: ['cancelled', 'canceled', 'refunded'] },
        startTime: { not: null },
        source: { not: 'quote' },
      },
      select: { startTime: true, endTime: true },
    });

    if (!isSlotOpen({ startTime, endTime }, timedBookings)) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'cancelled' },
      });
      return { ok: false, error: SLOT_GONE_MESSAGE };
    }
  } else {
    const capacity = dayBookingCapacity(availability.maxBookings);
    const existingBookings = await prisma.booking.count({
      where: {
        creatorId: booking.creatorId,
        bookingDate: dateOnly,
        id: { not: booking.id },
        status: { notIn: ['cancelled', 'canceled', 'refunded'] },
        source: { not: 'quote' },
      },
    });
    if (existingBookings >= capacity) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'cancelled' },
      });
      return { ok: false, error: SLOT_GONE_MESSAGE };
    }
  }

  return { ok: true };
}
