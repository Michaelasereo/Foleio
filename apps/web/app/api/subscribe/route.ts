import { NextRequest, NextResponse } from 'next/server';
import { subscribeToCreator, unsubscribeFromCreator } from '@/lib/actions/email';
import { prisma } from '@foleio/database';
import { getFanSession } from '@/lib/fan-auth/session';
import { isAdminAuthed } from '@/lib/admin/auth';
import { z } from 'zod';

const subscribeSchema = z.object({
  creatorId: z.string().uuid(),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = subscribeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await subscribeToCreator(
      validation.data.creatorId,
      validation.data.email
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Successfully subscribed!',
    });
  } catch (error) {
    console.error('Error subscribing:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

// Unsubscribe endpoint
export async function DELETE(request: NextRequest) {
  try {
    if (isAdminAuthed(request)) {
      const body = await request.json().catch(() => ({}));
      const subscriptionId = body?.subscriptionId as string | undefined;
      if (!subscriptionId) {
        return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });
      }

      const subscription = await prisma.fanSubscription.findUnique({
        where: { id: subscriptionId },
        select: { id: true, creatorId: true, status: true },
      });

      if (!subscription) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }

      await prisma.fanSubscription.update({
        where: { id: subscription.id },
        data: { status: 'canceled', cancelAtPeriodEnd: true },
      });

      if (subscription.status === 'active') {
        await prisma.creator.update({
          where: { id: subscription.creatorId },
          data: { subscriberCount: { decrement: 1 } },
        });
      }

      return NextResponse.json({ success: true });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const session = getFanSession(request);

    if (!token) {
      // Fan dashboard cancellation path
      if (session) {
        const body = await request.json().catch(() => ({}));
        const creatorId = body?.creatorId as string | undefined;
        if (!creatorId) {
          return NextResponse.json(
            { error: 'Missing creatorId' },
            { status: 400 }
          );
        }

        const fan = await prisma.user.findUnique({
          where: { email: session.email.toLowerCase() },
          select: { id: true },
        });

        if (!fan) {
          return NextResponse.json({ error: 'Fan not found' }, { status: 404 });
        }

        await prisma.fanSubscription.updateMany({
          where: { fanId: fan.id, creatorId },
          data: {
            status: 'canceled',
            cancelAtPeriodEnd: true,
          },
        });

        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { error: 'Missing unsubscribe token' },
        { status: 400 }
      );
    }

    const result = await unsubscribeFromCreator(token);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}

