import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toKobo(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function parseTierType(raw: unknown): 'paid' | 'free' | 'pickup' {
  const value = String(raw || 'paid').toLowerCase();
  if (value === 'free' || value === 'pickup') return value;
  return 'paid';
}

async function getCreatorId() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return creator?.id || null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const creatorId = await getCreatorId();
    if (!creatorId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.deliveryTier.findFirst({
      where: { id, creatorId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Delivery option not found' }, { status: 404 });
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const description = body?.description ? String(body.description) : null;
    const type = parseTierType(body?.type);
    const flatRate = type === 'paid' ? toKobo(body?.flatRate) : 0;

    if (!name) {
      return NextResponse.json({ error: 'Option name is required' }, { status: 400 });
    }

    const deliveryTier = await prisma.deliveryTier.update({
      where: { id },
      data: {
        name,
        description,
        type,
        estimatedDays: null,
        flatRate,
      },
    });

    return NextResponse.json({ deliveryTier });
  } catch (error) {
    console.error('[creator/delivery-tiers/:id][PATCH] failed:', error);
    return NextResponse.json({ error: 'Failed to update delivery tier' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const creatorId = await getCreatorId();
    if (!creatorId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.deliveryTier.findFirst({
      where: { id, creatorId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Delivery option not found' }, { status: 404 });
    }

    await prisma.deliveryTier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[creator/delivery-tiers/:id][DELETE] failed:', error);
    return NextResponse.json({ error: 'Failed to delete delivery tier' }, { status: 500 });
  }
}
