import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { BOOKINGS_PER_DAY } from '@/lib/booking/day-capacity';
import {
  generateHourlySlots,
  isValidHHmm,
  mergeWithCustom,
  timeToMinutes,
  type TimeRange,
} from '@/lib/booking/slots';

export const dynamic = 'force-dynamic';

type BulkBody = {
  dates?: string[];
  isAvailable?: boolean;
  mode?: 'full_day' | 'hours';
  startTime?: string | null;
  endTime?: string | null;
  customSlots?: TimeRange[];
  disabledGeneratedStarts?: string[];
  templateId?: string;
};

function dayKeyFrom(dateStr: string): string | null {
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 10);
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function replaceSlotsForDay(params: {
  creatorId: string;
  availabilityId: string;
  date: Date;
  mode: 'full_day' | 'hours';
  startTime?: string | null;
  endTime?: string | null;
  customSlots?: TimeRange[];
  disabledGeneratedStarts?: string[];
}) {
  const {
    creatorId,
    availabilityId,
    date,
    mode,
    startTime,
    endTime,
    customSlots = [],
    disabledGeneratedStarts = [],
  } = params;

  await prisma.availabilitySlot.deleteMany({
    where: { availabilityId },
  });

  if (mode !== 'hours' || !startTime || !endTime) {
    return;
  }

  const generated = generateHourlySlots(startTime, endTime, 60);
  const drafts = mergeWithCustom(generated, customSlots, disabledGeneratedStarts);

  if (drafts.length === 0) return;

  await prisma.availabilitySlot.createMany({
    data: drafts.map((slot) => ({
      creatorId,
      availabilityId,
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      source: slot.source,
      isActive: slot.isActive,
    })),
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true, username: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    const body = (await request.json()) as BulkBody;
    const { dates, isAvailable } = body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'Dates array is required' }, { status: 400 });
    }

    if (typeof isAvailable !== 'boolean') {
      return NextResponse.json({ error: 'isAvailable is required' }, { status: 400 });
    }

    let mode: 'full_day' | 'hours' = body.mode === 'hours' ? 'hours' : 'full_day';
    let startTime = body.startTime ?? null;
    let endTime = body.endTime ?? null;
    let customSlots = Array.isArray(body.customSlots) ? body.customSlots : [];
    let disabledGeneratedStarts = Array.isArray(body.disabledGeneratedStarts)
      ? body.disabledGeneratedStarts
      : [];

    if (body.templateId) {
      const template = await prisma.availabilityTemplate.findFirst({
        where: { id: body.templateId, creatorId: creator.id },
      });
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      mode = template.mode === 'hours' ? 'hours' : 'full_day';
      startTime = template.startTime;
      endTime = template.endTime;
      customSlots = (template.customSlots as TimeRange[]) || [];
      disabledGeneratedStarts =
        (template.disabledGeneratedStarts as string[]) || [];
    }

    if (isAvailable && mode === 'hours') {
      if (!startTime || !endTime || !isValidHHmm(startTime) || !isValidHHmm(endTime)) {
        return NextResponse.json(
          { error: 'Hours mode requires valid startTime and endTime (HH:mm)' },
          { status: 400 }
        );
      }
      if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
      for (const slot of customSlots) {
        if (
          !isValidHHmm(slot.startTime) ||
          !isValidHHmm(slot.endTime) ||
          timeToMinutes(slot.endTime) <= timeToMinutes(slot.startTime)
        ) {
          return NextResponse.json(
            { error: 'Invalid custom slot times' },
            { status: 400 }
          );
        }
      }
    }

    const results = [];
    let updated = 0;

    for (const dateStr of dates) {
      const dayKey = dayKeyFrom(String(dateStr));
      if (!dayKey) continue;
      const availabilityDate = new Date(`${dayKey}T00:00:00.000Z`);
      const capacity = isAvailable && mode === 'full_day' ? BOOKINGS_PER_DAY : null;
      const storeMode = isAvailable ? mode : 'full_day';

      const record = await prisma.creatorAvailability.upsert({
        where: {
          creatorId_date: {
            creatorId: creator.id,
            date: availabilityDate,
          },
        },
        update: {
          isAvailable,
          maxBookings: capacity,
          mode: storeMode,
          windowStart: isAvailable && mode === 'hours' ? startTime : null,
          windowEnd: isAvailable && mode === 'hours' ? endTime : null,
        },
        create: {
          creatorId: creator.id,
          date: availabilityDate,
          isAvailable,
          maxBookings: capacity,
          mode: storeMode,
          windowStart: isAvailable && mode === 'hours' ? startTime : null,
          windowEnd: isAvailable && mode === 'hours' ? endTime : null,
        },
      });

      if (!isAvailable || mode === 'full_day') {
        await prisma.availabilitySlot.deleteMany({
          where: { availabilityId: record.id },
        });
      } else {
        await replaceSlotsForDay({
          creatorId: creator.id,
          availabilityId: record.id,
          date: availabilityDate,
          mode,
          startTime,
          endTime,
          customSlots,
          disabledGeneratedStarts,
        });
      }

      results.push(record);
      updated += 1;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updated} date${updated === 1 ? '' : 's'}`,
      updated,
      results,
    });
  } catch (error: unknown) {
    console.error('Bulk availability update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update availability',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
