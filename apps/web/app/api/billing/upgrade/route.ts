import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { paystack } from '@/lib/paystack';
import {
  amountForPlan,
  resolvePaystackPlanCode,
} from '@/lib/billing/platform-plans';

/**
 * Paystack setup (create plans in dashboard, set env):
 * - PAYSTACK_PRO_MONTHLY_PLAN_CODE
 * - PAYSTACK_PRO_QUARTERLY_PLAN_CODE
 */
const upgradeSchema = z.object({
  plan: z.literal('pro'),
  interval: z.enum(['monthly', 'quarterly']),
});

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
      return NextResponse.json(
        { error: 'Invalid plan or interval. Use pro with monthly|quarterly.' },
        { status: 400 }
      );
    }

    const { plan, interval } = parsed.data;
    const amountKobo = amountForPlan(plan, interval);
    const planCode = resolvePaystackPlanCode(plan, interval);
    if (!planCode) {
      return NextResponse.json(
        {
          error: `Missing Paystack plan code for ${plan} / ${interval}. Set the matching PAYSTACK_*_PLAN_CODE env var.`,
        },
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

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com').replace(
      /\/$/,
      ''
    );

    const payment = await paystack.initializePayment({
      email: user.email || '',
      amount: amountKobo,
      plan: planCode,
      metadata: {
        type: 'platform_subscription',
        creatorId: creator.id,
        plan,
        billingInterval: interval,
      },
      callback_url: `${appUrl}/settings?tab=billing&upgraded=true`,
    });

    await prisma.platformSubscription.upsert({
      where: { creatorId: creator.id },
      update: {
        plan,
        status: 'pending',
        amount: amountKobo,
        billingInterval: interval,
        cancelAtPeriodEnd: false,
      },
      create: {
        creatorId: creator.id,
        plan,
        status: 'pending',
        amount: amountKobo,
        billingInterval: interval,
      },
    });

    return NextResponse.json({
      authorizationUrl: payment?.data?.authorization_url,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to upgrade billing plan',
      },
      { status: 500 }
    );
  }
}
