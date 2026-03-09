import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const activePlan = await prisma.creatorPlan.findFirst({
      where: {
        creatorId: creator.id,
        isActive: true,
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        price: true,
        features: true,
      },
    });

    const perksFromPlan = Array.isArray(activePlan?.features)
      ? activePlan?.features.map((perk) => String(perk))
      : [];

    return NextResponse.json({
      creator: {
        subscriptionEnabled: Boolean(activePlan),
        monthlyPrice: Math.floor(Number(activePlan?.price || 0) / 100),
        subscriptionPerks: perksFromPlan,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load subscription settings', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      subscriptionEnabled?: boolean;
      monthlyPrice?: number;
      subscriptionPerks?: string[];
    };

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        username: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const existingPlan = await prisma.creatorPlan.findFirst({
      where: { creatorId: creator.id },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        features: true,
        isActive: true,
      },
    });

    const nextEnabled =
      body.subscriptionEnabled !== undefined
        ? Boolean(body.subscriptionEnabled)
        : Boolean(existingPlan?.isActive);
    const nextPriceNaira =
      body.monthlyPrice !== undefined
        ? Math.max(0, Number(body.monthlyPrice) || 0)
        : Math.floor(Number(existingPlan?.price || 0) / 100) || 2000;
    const nextPerks =
      body.subscriptionPerks !== undefined
        ? (Array.isArray(body.subscriptionPerks)
            ? body.subscriptionPerks.map((perk) => String(perk).trim()).filter(Boolean)
            : [])
        : (Array.isArray(existingPlan?.features)
            ? existingPlan?.features.map((perk) => String(perk).trim()).filter(Boolean)
            : []);

    let updatedPlan;
    if (existingPlan) {
      updatedPlan = await prisma.creatorPlan.update({
        where: { id: existingPlan.id },
        data: {
          isActive: nextEnabled,
          price: nextPriceNaira * 100,
          features: nextPerks,
        },
        select: {
          id: true,
          isActive: true,
          price: true,
          features: true,
        },
      });
    } else {
      updatedPlan = await prisma.creatorPlan.create({
        data: {
          creatorId: creator.id,
          name: 'Monthly Subscription',
          description: 'Access to all premium content',
          price: nextPriceNaira * 100,
          features: nextPerks,
          isActive: nextEnabled,
          orderIndex: 0,
        },
        select: {
          id: true,
          isActive: true,
          price: true,
          features: true,
        },
      });
    }

    return NextResponse.json({
      creator: {
        subscriptionEnabled: Boolean(updatedPlan.isActive),
        monthlyPrice: Math.floor(Number(updatedPlan.price || 0) / 100),
        subscriptionPerks: Array.isArray(updatedPlan.features)
          ? updatedPlan.features.map((perk) => String(perk))
          : [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update subscription settings', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
