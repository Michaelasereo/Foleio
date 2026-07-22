import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { getEffectiveCreatorPlanLimits } from '@/lib/billing/effective-plan-limits';
import {
  normalizeCouponCode,
  parseCouponType,
} from '@/lib/shop/coupons';

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
    select: {
      id: true,
      platformPlan: true,
      platformSubscriptionActive: true,
    },
  });
}

function parseOptionalDate(raw: unknown): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parseOptionalNonNegInt(raw: unknown): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const creator = await getCreator();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const limits = await getEffectiveCreatorPlanLimits(creator);
    if (!limits.canUseCoupons) {
      return NextResponse.json(
        { error: 'Plan limit reached', limitType: 'coupons' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await prisma.coupon.findFirst({
      where: { id, creatorId: creator.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: {
      code?: string;
      type?: string;
      value?: number;
      minSubtotalKobo?: number | null;
      maxUses?: number | null;
      startsAt?: Date | null;
      endsAt?: Date | null;
      status?: string;
    } = {};

    if (body?.code != null) {
      const code = normalizeCouponCode(body.code);
      if (!code || code.length < 3) {
        return NextResponse.json(
          { error: 'Coupon code must be at least 3 characters' },
          { status: 400 }
        );
      }
      if (code !== existing.code) {
        const clash = await prisma.coupon.findFirst({
          where: { creatorId: creator.id, code, NOT: { id } },
          select: { id: true },
        });
        if (clash) {
          return NextResponse.json(
            { error: 'A coupon with this code already exists' },
            { status: 409 }
          );
        }
      }
      data.code = code;
    }

    const nextType = body?.type != null ? parseCouponType(body.type) : null;
    if (body?.type != null && !nextType) {
      return NextResponse.json(
        { error: 'Coupon type must be percent or fixed' },
        { status: 400 }
      );
    }
    if (nextType) data.type = nextType;

    const type = (data.type || existing.type) as string;

    if (body?.value != null) {
      let value = Number(body.value);
      if (!Number.isFinite(value) || value <= 0) {
        return NextResponse.json({ error: 'Coupon value is required' }, { status: 400 });
      }
      if (type === 'percent') {
        value = Math.floor(value);
        if (value < 1 || value > 100) {
          return NextResponse.json(
            { error: 'Percent coupons must be between 1 and 100' },
            { status: 400 }
          );
        }
      } else {
        const asKobo =
          body?.valueIsNaira === true || body?.valueUnit === 'naira'
            ? Math.round(value * 100)
            : Math.round(value);
        if (asKobo < 100) {
          return NextResponse.json(
            { error: 'Fixed coupon must be at least ₦1' },
            { status: 400 }
          );
        }
        value = asKobo;
      }
      data.value = value;
    }

    if (body?.minSubtotalKobo !== undefined || body?.minSubtotalNaira !== undefined) {
      if (body.minSubtotalKobo !== undefined) {
        const parsed = parseOptionalNonNegInt(body.minSubtotalKobo);
        if (parsed === undefined) {
          return NextResponse.json({ error: 'Minimum spend is invalid' }, { status: 400 });
        }
        data.minSubtotalKobo = parsed && parsed > 0 ? parsed : null;
      } else if (body.minSubtotalNaira === null || body.minSubtotalNaira === '') {
        data.minSubtotalKobo = null;
      } else {
        const naira = Number(body.minSubtotalNaira);
        if (!Number.isFinite(naira) || naira < 0) {
          return NextResponse.json({ error: 'Minimum spend is invalid' }, { status: 400 });
        }
        const kobo = Math.round(naira * 100);
        data.minSubtotalKobo = kobo > 0 ? kobo : null;
      }
    }

    if (body?.maxUses !== undefined) {
      const parsed = parseOptionalNonNegInt(body.maxUses);
      if (parsed === undefined) {
        return NextResponse.json({ error: 'Max uses is invalid' }, { status: 400 });
      }
      data.maxUses = parsed && parsed > 0 ? parsed : null;
    }

    if (body?.startsAt !== undefined) {
      const startsAt = parseOptionalDate(body.startsAt);
      if (startsAt === undefined) {
        return NextResponse.json({ error: 'Start date is invalid' }, { status: 400 });
      }
      data.startsAt = startsAt;
    }

    if (body?.endsAt !== undefined) {
      const endsAt = parseOptionalDate(body.endsAt);
      if (endsAt === undefined) {
        return NextResponse.json({ error: 'End date is invalid' }, { status: 400 });
      }
      data.endsAt = endsAt;
    }

    const startsAt = data.startsAt !== undefined ? data.startsAt : existing.startsAt;
    const endsAt = data.endsAt !== undefined ? data.endsAt : existing.endsAt;
    if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    if (body?.status != null) {
      const status = String(body.status);
      if (status !== 'active' && status !== 'disabled') {
        return NextResponse.json({ error: 'Status is invalid' }, { status: 400 });
      }
      data.status = status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data,
    });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('[creator/coupons/:id][PATCH] failed:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
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
    const existing = await prisma.coupon.findFirst({
      where: { id, creatorId: creator.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[creator/coupons/:id][DELETE] failed:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
