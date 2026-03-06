import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { paystack } from '@/lib/paystack';

const upgradeSchema = z.object({
  plan: z.enum(['pro', 'premium']),
});

const PLAN_CODES: Record<'pro' | 'premium', string | undefined> = {
  pro: process.env.PAYSTACK_PRO_PLAN_CODE,
  premium: process.env.PAYSTACK_PREMIUM_PLAN_CODE,
};

const PLAN_AMOUNTS: Record<'pro' | 'premium', number> = {
  pro: 800000,
  premium: 1500000,
};

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

    const payload = await request.json();
    const parsed = upgradeSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid plan selection' }, { status: 400 });
    }

    const { plan } = parsed.data;
    const planCode = PLAN_CODES[plan];
    if (!planCode) {
      return NextResponse.json(
        { error: `Missing env var for plan code: ${plan}` },
        { status: 500 }
      );
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const proHistory = await prisma.platformSubscription.findFirst({
      where: {
        creatorId: creator.id,
        plan: 'pro',
      },
    });
    const trialEligible = plan === 'pro' && !proHistory;

    const payment = await paystack.initializePayment({
      email: user.email || '',
      amount: PLAN_AMOUNTS[plan],
      plan: planCode,
      metadata: {
        type: 'platform_subscription',
        creatorId: creator.id,
        plan,
        ...(trialEligible ? { trial: true, trialDays: 3 } : {}),
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'}/billing?upgraded=true`,
    });

    await prisma.platformSubscription.upsert({
      where: { creatorId: creator.id },
      update: {
        plan,
        status: 'pending',
        amount: PLAN_AMOUNTS[plan],
      },
      create: {
        creatorId: creator.id,
        plan,
        status: 'pending',
        amount: PLAN_AMOUNTS[plan],
      },
    });

    return NextResponse.json({
      authorizationUrl: payment?.data?.authorization_url,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upgrade billing plan' },
      { status: 500 }
    );
  }
}
