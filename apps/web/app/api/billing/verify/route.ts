import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { paystack } from '@/lib/paystack';
import { activatePlatformSubscription } from '@/lib/billing/activate-platform-subscription';

const verifySchema = z.object({
  reference: z.string().min(1),
});

/**
 * Confirms a platform plan upgrade via Paystack transaction verify.
 */
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

    const body = await request.json().catch(() => ({}));
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payment reference required' }, { status: 400 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const verified = await paystack.verifyPayment(parsed.data.reference);
    const txn = verified?.data;

    if (!txn || txn.status !== 'success') {
      return NextResponse.json(
        { error: 'Payment not successful yet. Try again in a moment.' },
        { status: 402 }
      );
    }

    const metadata = txn.metadata || {};
    const type = metadata.type || metadata.Type;
    if (type !== 'platform_subscription') {
      return NextResponse.json(
        { error: 'This payment is not a Foleio platform plan upgrade.' },
        { status: 400 }
      );
    }

    const metaCreatorId = metadata.creatorId || metadata.creator_id;
    if (metaCreatorId && metaCreatorId !== creator.id) {
      return NextResponse.json(
        { error: 'Payment does not belong to this account.' },
        { status: 403 }
      );
    }

    const subscriptionCode =
      txn.subscription_code ||
      txn.subscription?.subscription_code ||
      null;

    const emailToken =
      txn.email_token ||
      txn.subscription?.email_token ||
      metadata.email_token ||
      null;

    const result = await activatePlatformSubscription({
      creatorId: creator.id,
      plan: metadata.plan || 'pro',
      amountKobo: typeof txn.amount === 'number' ? txn.amount : undefined,
      billingInterval: metadata.billingInterval || metadata.billing_interval || null,
      subscriptionCode,
      emailToken,
    });

    return NextResponse.json({
      success: true,
      plan: result.plan,
      billingInterval: result.billingInterval,
    });
  } catch (error: unknown) {
    console.error('[billing/verify]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to verify billing payment',
      },
      { status: 500 }
    );
  }
}
