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

export async function GET() {
  try {
    const creator = await getCreator();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const coupons = await prisma.coupon.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error('[creator/coupons][GET] failed:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const code = normalizeCouponCode(body?.code);
    const type = parseCouponType(body?.type);

    if (!code || code.length < 3) {
      return NextResponse.json(
        { error: 'Coupon code must be at least 3 characters' },
        { status: 400 }
      );
    }
    if (!type) {
      return NextResponse.json(
        { error: 'Coupon type must be percent or fixed' },
        { status: 400 }
      );
    }

    let value = Number(body?.value);
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
      // Accept naira from UI and store as kobo when body.valueIsNaira
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

    const minSubtotalRaw = parseOptionalNonNegInt(body?.minSubtotalKobo);
    if (minSubtotalRaw === undefined && body?.minSubtotalNaira != null && body.minSubtotalNaira !== '') {
      const naira = Number(body.minSubtotalNaira);
      if (!Number.isFinite(naira) || naira < 0) {
        return NextResponse.json({ error: 'Minimum spend is invalid' }, { status: 400 });
      }
    }
    let minSubtotalKobo =
      minSubtotalRaw === undefined
        ? body?.minSubtotalNaira != null && body.minSubtotalNaira !== ''
          ? Math.round(Number(body.minSubtotalNaira) * 100)
          : null
        : minSubtotalRaw;

    if (minSubtotalKobo != null && (!Number.isFinite(minSubtotalKobo) || minSubtotalKobo < 0)) {
      return NextResponse.json({ error: 'Minimum spend is invalid' }, { status: 400 });
    }

    const maxUses = parseOptionalNonNegInt(body?.maxUses);
    if (maxUses === undefined && body?.maxUses != null && body.maxUses !== '') {
      return NextResponse.json({ error: 'Max uses is invalid' }, { status: 400 });
    }

    const startsAt = parseOptionalDate(body?.startsAt);
    if (startsAt === undefined && body?.startsAt != null && body.startsAt !== '') {
      return NextResponse.json({ error: 'Start date is invalid' }, { status: 400 });
    }
    const endsAt = parseOptionalDate(body?.endsAt);
    if (endsAt === undefined && body?.endsAt != null && body.endsAt !== '') {
      return NextResponse.json({ error: 'End date is invalid' }, { status: 400 });
    }

    if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const existing = await prisma.coupon.findFirst({
      where: { creatorId: creator.id, code },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A coupon with this code already exists' },
        { status: 409 }
      );
    }

    const status =
      body?.status === 'disabled' ? 'disabled' : 'active';

    const coupon = await prisma.coupon.create({
      data: {
        id: crypto.randomUUID(),
        creatorId: creator.id,
        code,
        type,
        value,
        minSubtotalKobo: minSubtotalKobo && minSubtotalKobo > 0 ? minSubtotalKobo : null,
        maxUses: maxUses && maxUses > 0 ? maxUses : null,
        startsAt: startsAt ?? null,
        endsAt: endsAt ?? null,
        status,
      },
    });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('[creator/coupons][POST] failed:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
