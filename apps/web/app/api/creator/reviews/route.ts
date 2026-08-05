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

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Manual reviews are disabled. Customers leave reviews from the email link after a completed booking or delivered order.',
    },
    { status: 405 }
  );
}
