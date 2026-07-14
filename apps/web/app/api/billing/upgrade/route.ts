import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { paystack } from '@/lib/paystack';

/**
 * Paystack setup:
 * 1. Dashboard → Plans → create "Foleio Pro", amount 1000000 kobo, interval monthly, NGN
 * 2. Set PAYSTACK_PRO_PLAN_CODE=PLN_...
 */
const upgradeSchema = z.object({
  plan: z.literal('pro'),
});

const PRO_AMOUNT_KOBO = 1_000_000; // ₦10,000

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

    const planCode = process.env.PAYSTACK_PRO_PLAN_CODE;
    if (!planCode) {
      return NextResponse.json(
        { error: 'Missing env var PAYSTACK_PRO_PLAN_CODE' },
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
      amount: PRO_AMOUNT_KOBO,
      plan: planCode,
      metadata: {
        type: 'platform_subscription',
        creatorId: creator.id,
        plan: 'pro',
      },
      callback_url: `${appUrl}/settings?tab=billing&upgraded=true`,
    });

    await prisma.platformSubscription.upsert({
      where: { creatorId: creator.id },
      update: {
        plan: 'pro',
        status: 'pending',
        amount: PRO_AMOUNT_KOBO,
        cancelAtPeriodEnd: false,
      },
      create: {
        creatorId: creator.id,
        plan: 'pro',
        status: 'pending',
        amount: PRO_AMOUNT_KOBO,
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
