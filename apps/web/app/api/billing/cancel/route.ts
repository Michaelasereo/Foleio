import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { paystack } from '@/lib/paystack';

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
      return NextResponse.json({ success: true });
    }

    if (subscription.paystackSubscriptionId) {
      const disableToken = process.env.PAYSTACK_SUBSCRIPTION_DISABLE_TOKEN;
      if (!disableToken) {
        return NextResponse.json(
          { error: 'Missing PAYSTACK_SUBSCRIPTION_DISABLE_TOKEN env var' },
          { status: 500 }
        );
      }

      await paystack.disableSubscription({
        code: subscription.paystackSubscriptionId,
        token: disableToken,
      });
    }

    await prisma.platformSubscription.update({
      where: { creatorId: creator.id },
      data: {
        status: 'cancelled',
        cancelAtPeriodEnd: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to cancel billing plan' },
      { status: 500 }
    );
  }
}
