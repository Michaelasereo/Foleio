import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { getEffectiveCreatorPlanLimits } from '@/lib/billing/effective-plan-limits';
import { parseOptionalPositiveInt } from '@/lib/shop/delivery-fee';
import { nairaInputToKobo } from '@/lib/shop/money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const toKobo = nairaInputToKobo;

function parseTierType(raw: unknown): 'paid' | 'free' | 'pickup' | 'customer_arranged' {
  const value = String(raw || 'paid').toLowerCase();
  if (value === 'free' || value === 'pickup' || value === 'customer_arranged') return value;
  return 'paid';
}

function parseContactPhone(raw: unknown, type: string): string | null {
  const phone = String(raw || '').trim();
  if (type !== 'customer_arranged') return null;
  return phone || null;
}

async function getCreator() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  return prisma.creator.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      platformPlan: true,
      platformSubscriptionActive: true,
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const creator = await getCreator();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.deliveryTier.findFirst({
      where: { id, creatorId: creator.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Delivery option not found' }, { status: 404 });
    }

    const limits = await getEffectiveCreatorPlanLimits(creator);
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const description = body?.description ? String(body.description) : null;
    const type = parseTierType(body?.type);
    const flatRate = type === 'paid' ? toKobo(body?.flatRate) : 0;
    const contactPhone = parseContactPhone(body?.contactPhone, type);

    let minSubtotalKobo: number | null = null;
    let minItemQuantity: number | null = null;
    if (type === 'paid') {
      const rawMinSpend =
        body?.minSubtotalKobo != null
          ? body.minSubtotalKobo
          : body?.minSubtotal != null
            ? toKobo(body.minSubtotal)
            : null;
      minSubtotalKobo = parseOptionalPositiveInt(rawMinSpend);
      minItemQuantity = parseOptionalPositiveInt(body?.minItemQuantity);
      if (
        (minSubtotalKobo != null || minItemQuantity != null) &&
        !limits.canUseConditionalDelivery
      ) {
        return NextResponse.json(
          { error: 'Plan limit reached', limitType: 'conditionalDelivery' },
          { status: 403 }
        );
      }
    }

    if (!name) {
      return NextResponse.json({ error: 'Option name is required' }, { status: 400 });
    }
    if (type === 'customer_arranged' && !contactPhone) {
      return NextResponse.json(
        { error: 'Add a phone number buyers can call to arrange delivery' },
        { status: 400 }
      );
    }

    const deliveryTier = await prisma.deliveryTier.update({
      where: { id },
      data: {
        name,
        description,
        type,
        estimatedDays: null,
        flatRate,
        minSubtotalKobo,
        minItemQuantity,
        contactPhone,
      },
    });

    return NextResponse.json({ deliveryTier });
  } catch (error) {
    console.error('[creator/delivery-tiers/:id][PATCH] failed:', error);
    return NextResponse.json({ error: 'Failed to update delivery tier' }, { status: 500 });
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
    const existing = await prisma.deliveryTier.findFirst({
      where: { id, creatorId: creator.id },
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
