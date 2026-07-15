import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { isValidHHmm, timeToMinutes, type TimeRange } from '@/lib/booking/slots';

export const dynamic = 'force-dynamic';

async function requireCreator() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Authentication required' as const, status: 401 };

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!creator) return { error: 'Creator profile not found' as const, status: 404 };
  return { creator };
}

export async function GET() {
  try {
    const auth = await requireCreator();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const templates = await prisma.availabilityTemplate.findMany({
      where: { creatorId: auth.creator.id },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[availability templates GET]', error);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireCreator();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const name = String(body.name || '').trim().slice(0, 80);
    const mode = body.mode === 'hours' ? 'hours' : 'full_day';
    const startTime = body.startTime ? String(body.startTime) : null;
    const endTime = body.endTime ? String(body.endTime) : null;
    const customSlots = (Array.isArray(body.customSlots) ? body.customSlots : []) as TimeRange[];
    const disabledGeneratedStarts = Array.isArray(body.disabledGeneratedStarts)
      ? body.disabledGeneratedStarts.map(String)
      : [];

    if (!name) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    if (mode === 'hours') {
      const hasWindow =
        Boolean(startTime) &&
        Boolean(endTime) &&
        isValidHHmm(String(startTime)) &&
        isValidHHmm(String(endTime));
      const hasCustom = customSlots.length > 0;

      if (!hasWindow && !hasCustom) {
        return NextResponse.json(
          {
            error:
              'Hours template needs a From–To range or at least one custom time',
          },
          { status: 400 }
        );
      }

      if (startTime || endTime) {
        if (!hasWindow) {
          return NextResponse.json(
            { error: 'Hours template requires valid start and end times' },
            { status: 400 }
          );
        }
        if (timeToMinutes(String(endTime)) <= timeToMinutes(String(startTime))) {
          return NextResponse.json(
            { error: 'End time must be after start time' },
            { status: 400 }
          );
        }
      }
    }

    const template = await prisma.availabilityTemplate.create({
      data: {
        creatorId: auth.creator.id,
        name,
        mode,
        startTime: mode === 'hours' && startTime && endTime ? startTime : null,
        endTime: mode === 'hours' && startTime && endTime ? endTime : null,
        slotIntervalMinutes: 60,
        customSlots: mode === 'hours' ? customSlots : [],
        disabledGeneratedStarts:
          mode === 'hours' && startTime && endTime ? disabledGeneratedStarts : [],
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('[availability templates POST]', error);
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireCreator();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Template id is required' }, { status: 400 });
    }

    const existing = await prisma.availabilityTemplate.findFirst({
      where: { id, creatorId: auth.creator.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await prisma.availabilityTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[availability templates DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
