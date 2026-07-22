import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getCreator() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  return prisma.creator.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const creator = await getCreator();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.creatorReview.findFirst({
      where: { id, creatorId: creator.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: {
      customerName?: string;
      location?: string | null;
      quote?: string;
      isActive?: boolean;
      orderIndex?: number;
    } = {};

    if (body?.customerName != null) {
      const customerName = String(body.customerName).trim();
      if (!customerName) {
        return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
      }
      data.customerName = customerName;
    }

    if (body?.location != null) {
      data.location = String(body.location).trim() || null;
    }

    if (body?.quote != null) {
      const quote = String(body.quote).trim();
      if (!quote) {
        return NextResponse.json({ error: 'Review quote is required' }, { status: 400 });
      }
      data.quote = quote;
    }

    if (body?.isActive != null) {
      data.isActive = Boolean(body.isActive);
    }

    if (body?.orderIndex != null) {
      const orderIndex = Number(body.orderIndex);
      if (!Number.isFinite(orderIndex) || orderIndex < 0) {
        return NextResponse.json({ error: 'Order index is invalid' }, { status: 400 });
      }
      data.orderIndex = Math.floor(orderIndex);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const review = await prisma.creatorReview.update({
      where: { id },
      data,
    });

    return NextResponse.json({ review });
  } catch (error) {
    console.error('[creator/reviews/:id][PATCH] failed:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const creator = await getCreator();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.creatorReview.findFirst({
      where: { id, creatorId: creator.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    await prisma.creatorReview.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[creator/reviews/:id][DELETE] failed:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
