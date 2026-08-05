import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['confirmed', 'processing', 'delivered'] as const;

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  processing: 'Processing',
  delivered: 'Delivered',
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
      select: { id: true, displayName: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const { status } = await request.json();
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { id } = await params;
    const existing = await prisma.order.findFirst({
      where: { id, creatorId: creator.id },
      include: {
        items: { include: { product: true } },
        deliveryTier: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: {
        items: { include: { product: true } },
        deliveryTier: true,
      },
    });

    const deliveryAddress = (order.deliveryAddress || {}) as Record<string, string>;
    const fanEmail = String(deliveryAddress.email || '').trim();
    if (fanEmail) {
      const statusLabel = STATUS_LABELS[status] || status.replace('_', ' ');
      void sendEmail({
        to: fanEmail,
        subject: `Order update from ${creator.displayName}`,
        html: `
          <p>Hi ${deliveryAddress.name || 'there'},</p>
          <p>Your order <strong>#${order.id.slice(-8).toUpperCase()}</strong> is now <strong>${statusLabel}</strong>.</p>
          <p>You can track your order in your fan dashboard.</p>
        `,
      });
    }

    if (status === 'delivered' && existing.status !== 'delivered') {
      const { sendShopOrderReviewRequest } = await import('@/lib/reviews/request');
      void sendShopOrderReviewRequest(order.id).catch((err) => {
        console.error('[creator/orders/status] review request failed:', err);
      });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('[creator/orders/:id/status][PATCH] failed:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
