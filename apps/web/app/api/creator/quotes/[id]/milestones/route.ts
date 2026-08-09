import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';
import { newEntityId, type QuoteMilestone } from '@/lib/quotes/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function normalizeMilestones(raw: unknown): QuoteMilestone[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row: Record<string, unknown>) => ({
    id: String(row.id || newEntityId()),
    label: String(row.label || 'Milestone').trim() || 'Milestone',
    dueDate: row.dueDate ? String(row.dueDate) : null,
    status: row.status === 'done' ? 'done' : 'pending',
  }));
}

export async function POST(request: Request, context: RouteContext) {
  const access = await assertCreatorApiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const milestones = normalizeMilestones(body.milestones);

  const quote = await prisma.quote.findFirst({
    where: { id, creatorId: access.access.creator.id },
  });

  if (quote) {
    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: { milestones },
    });

    if (quote.convertedBookingId) {
      await prisma.booking.update({
        where: { id: quote.convertedBookingId },
        data: { milestones },
      });
    }

    return NextResponse.json({ quote: updated, milestones });
  }

  // Also allow updating milestones on a converted booking by booking id
  const booking = await prisma.booking.findFirst({
    where: {
      id,
      creatorId: access.access.creator.id,
      source: 'quote',
    },
  });
  if (!booking) {
    return NextResponse.json({ error: 'Quote or booking not found' }, { status: 404 });
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: { milestones },
  });

  await prisma.quote.updateMany({
    where: { convertedBookingId: booking.id },
    data: { milestones },
  });

  return NextResponse.json({ booking: updatedBooking, milestones });
}
