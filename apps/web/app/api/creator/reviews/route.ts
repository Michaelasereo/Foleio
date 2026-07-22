import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { getEffectiveCreatorPlanLimits } from '@/lib/billing/effective-plan-limits';

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
      reviewsEnabled: true,
      platformPlan: true,
      platformSubscriptionActive: true,
    },
  });
}

export async function GET() {
  try {
    const creator = await getCreator();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const reviews = await prisma.creatorReview.findMany({
      where: { creatorId: creator.id },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({
      reviews,
      reviewsEnabled: creator.reviewsEnabled,
    });
  } catch (error) {
    console.error('[creator/reviews][GET] failed:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const creator = await getCreator();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    if (body?.reviewsEnabled == null) {
      return NextResponse.json({ error: 'reviewsEnabled is required' }, { status: 400 });
    }

    const reviewsEnabled = Boolean(body.reviewsEnabled);
    const updated = await prisma.creator.update({
      where: { id: creator.id },
      data: { reviewsEnabled },
      select: { reviewsEnabled: true },
    });

    return NextResponse.json({ reviewsEnabled: updated.reviewsEnabled });
  } catch (error) {
    console.error('[creator/reviews][PATCH] failed:', error);
    return NextResponse.json({ error: 'Failed to update reviews setting' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const creator = await getCreator();
    if (!creator) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const limits = await getEffectiveCreatorPlanLimits(creator);
    const reviewCount = await prisma.creatorReview.count({
      where: { creatorId: creator.id },
    });

    if (reviewCount >= limits.maxReviews) {
      return NextResponse.json(
        { error: 'Plan limit reached', limitType: 'maxReviews' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const customerName = String(body?.customerName || '').trim();
    const location = String(body?.location || '').trim() || null;
    const quote = String(body?.quote || '').trim();

    if (!customerName) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (!quote) {
      return NextResponse.json({ error: 'Review quote is required' }, { status: 400 });
    }

    const review = await prisma.creatorReview.create({
      data: {
        id: crypto.randomUUID(),
        creatorId: creator.id,
        customerName,
        location,
        quote,
        orderIndex: reviewCount,
        isActive: true,
      },
    });

    return NextResponse.json({ review });
  } catch (error) {
    console.error('[creator/reviews][POST] failed:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
