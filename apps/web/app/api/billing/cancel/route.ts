import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { paystack } from '@/lib/paystack';

async function resolveEmailToken(
  subscriptionCode: string,
  storedToken?: string | null
): Promise<string | null> {
  if (storedToken) return storedToken;

  try {
    const fetched = await paystack.fetchSubscription(subscriptionCode);
    const token =
      fetched?.data?.email_token ||
      fetched?.data?.emailToken ||
      null;
    if (token) {
      await prisma.platformSubscription.updateMany({
        where: { paystackSubscriptionId: subscriptionCode },
        data: { paystackEmailToken: String(token) },
      });
      return String(token);
    }
  } catch (error) {
    console.error('[billing/cancel] fetchSubscription failed', error);
  }

  // Legacy single-sub testing fallback
  return process.env.PAYSTACK_SUBSCRIPTION_DISABLE_TOKEN || null;
}

export async function POST() {
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
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const subscription = await prisma.platformSubscription.findUnique({
      where: { creatorId: creator.id },
    });

    if (!subscription) {
      await prisma.creator.update({
        where: { id: creator.id },
        data: {
          platformSubscriptionActive: false,
          platformPlan: 'starter',
        },
      });
      return NextResponse.json({ success: true });
    }

    if (subscription.paystackSubscriptionId) {
      const emailToken = await resolveEmailToken(
        subscription.paystackSubscriptionId,
        subscription.paystackEmailToken
      );

      if (!emailToken) {
        return NextResponse.json(
          {
            error:
              'Could not resolve Paystack email token for this subscription. Try again after your next billing webhook, or contact support.',
          },
          { status: 500 }
        );
      }

      await paystack.disableSubscription({
        code: subscription.paystackSubscriptionId,
        token: emailToken,
      });
    }

    await prisma.$transaction([
      prisma.platformSubscription.update({
        where: { creatorId: creator.id },
        data: {
          status: 'cancelled',
          cancelAtPeriodEnd: false,
        },
      }),
      prisma.creator.update({
        where: { id: creator.id },
        data: {
          platformSubscriptionActive: false,
          platformPlan: 'starter',
        },
      }),
    ]);

    try {
      const { syncCreatorSubaccountFee } = await import('@/lib/billing/platform-fee');
      await syncCreatorSubaccountFee(creator.id);
    } catch (feeError) {
      console.error('[billing/cancel] fee sync failed', feeError);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to cancel billing plan',
      },
      { status: 500 }
    );
  }
}
