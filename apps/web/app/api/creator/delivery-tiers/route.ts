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

export async function GET() {
  try {
    const creatorId = await getCreatorId();
    if (!creatorId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const deliveryTiers = await prisma.deliveryTier.findMany({
      where: { creatorId },
      orderBy: { flatRate: 'asc' },
    });

    return NextResponse.json({ deliveryTiers });
  } catch (error) {
    console.error('[creator/delivery-tiers][GET] failed:', error);
    return NextResponse.json({ error: 'Failed to fetch delivery tiers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const creatorId = await getCreatorId();
    if (!creatorId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const description = body?.description ? String(body.description) : null;
    const estimatedDays = body?.estimatedDays ? String(body.estimatedDays) : null;
    const flatRate = toKobo(body?.flatRate);

    if (!name) {
      return NextResponse.json({ error: 'Tier name is required' }, { status: 400 });
    }

    if (flatRate < 0) {
      return NextResponse.json({ error: 'Flat rate is invalid' }, { status: 400 });
    }

    const deliveryTier = await prisma.deliveryTier.create({
      data: {
        id: crypto.randomUUID(),
        creatorId,
        name,
        description,
        estimatedDays,
        flatRate,
      },
    });

    return NextResponse.json({ deliveryTier });
  } catch (error) {
    console.error('[creator/delivery-tiers][POST] failed:', error);
    return NextResponse.json({ error: 'Failed to create delivery tier' }, { status: 500 });
  }
}
