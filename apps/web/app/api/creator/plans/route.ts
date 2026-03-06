import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { getPlanLimits } from '@/lib/utils/plan-limits';

export async function POST(request: Request) {
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
      select: { id: true, platformPlan: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const limits = getPlanLimits(creator.platformPlan ?? null);
    if (Number.isFinite(limits.maxSubscriptionPlans)) {
      const planCount = await prisma.creatorPlan.count({
        where: { creatorId: creator.id, isActive: true },
      });
      if (planCount >= limits.maxSubscriptionPlans) {
        return NextResponse.json(
          { error: 'Plan limit reached', limitType: 'maxSubscriptionPlans' },
          { status: 403 }
        );
      }
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      price?: number;
      features?: string[];
    };

    if (!body.name || !body.price || body.price <= 0) {
      return NextResponse.json(
        { error: 'name and price are required' },
        { status: 400 }
      );
    }

    const existingCount = await prisma.creatorPlan.count({
      where: { creatorId: creator.id },
    });

    const plan = await prisma.creatorPlan.create({
      data: {
        creatorId: creator.id,
        name: body.name,
        description: body.description || null,
        price: body.price,
        features: body.features || [],
        isActive: true,
        orderIndex: existingCount,
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create creator plan' },
      { status: 500 }
    );
  }
}
