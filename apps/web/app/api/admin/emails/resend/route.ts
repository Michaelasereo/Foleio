import { prisma } from '@foleio/database';
import { getAdminIdFromRequest, isAdminAuthed } from '@/lib/admin/auth';
import { sendBookingConfirmationEmail } from '@/lib/actions/email';
import { sendOrderConfirmationEmail } from '@/lib/email/resend';
import { resolveDigitalDownloadUrl } from '@/lib/shop/digital-downloads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveAdminSampleEmail(request: Request): Promise<string | null> {
  const adminId = getAdminIdFromRequest(request);
  if (!adminId) return null;
  try {
    const admin = await (prisma as any).adminUser.findUnique({
      where: { id: adminId },
      select: { email: true },
    });
    const email = String(admin?.email || '').trim();
    return email || null;
  } catch {
    return null;
  }
}

/**
 * Admin: re-trigger a customer email after a delivery failure (e.g. Resend
 * outage or misconfiguration that has since been fixed).
 * Also sends a sample copy of the customer email to the logged-in admin.
 *
 * Body: { type: 'booking' | 'shop_order', id: string }
 */
export async function POST(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { type?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const type = String(body?.type || '').trim();
  const id = String(body?.id || '').trim();
  if (!id || !['booking', 'shop_order'].includes(type)) {
    return Response.json(
      { error: 'type must be booking or shop_order, and id is required' },
      { status: 400 }
    );
  }

  const sampleTo = await resolveAdminSampleEmail(request);

  try {
    if (type === 'booking') {
      const booking = await prisma.booking.findUnique({
        where: { id },
        select: { id: true, status: true, customerEmail: true },
      });
      if (!booking) {
        return Response.json({ error: 'Booking not found' }, { status: 404 });
      }
      if (booking.status === 'pending') {
        return Response.json(
          { error: 'Booking has not been paid yet — no confirmation email to send' },
          { status: 400 }
        );
      }

      const result = await sendBookingConfirmationEmail(booking.id, {
        sampleTo: sampleTo || undefined,
      });
      if ('error' in result && result.error) {
        return Response.json({ error: result.error }, { status: 502 });
      }
      return Response.json({
        success: true,
        sentTo: booking.customerEmail,
        creatorNotified: Boolean(
          'creatorNotified' in result && result.creatorNotified
        ),
        sampleSent: Boolean('sampleSent' in result && result.sampleSent),
        sampleTo: sampleTo || null,
      });
    }

    // shop_order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        creator: { select: { displayName: true } },
        items: {
          include: {
            product: {
              select: { name: true, type: true, digitalFileUrl: true },
            },
          },
        },
        deliveryTier: true,
      },
    });
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status === 'pending' || order.status === 'cancelled') {
      return Response.json(
        { error: `Order is ${order.status} — no confirmation email to send` },
        { status: 400 }
      );
    }

    const deliveryAddress = (order.deliveryAddress || {}) as Record<string, string>;
    const recipientEmail = String(deliveryAddress.email || '').trim();
    if (!recipientEmail) {
      return Response.json(
        { error: 'Order has no customer email on file' },
        { status: 400 }
      );
    }

    const result = await sendOrderConfirmationEmail({
      email: recipientEmail,
      fanName: deliveryAddress.name,
      orderId: order.id,
      items: await Promise.all(
        order.items.map(async (item) => {
          const productType =
            (item.product?.type as 'physical' | 'digital' | null) || null;
          const rawDigitalUrl = item.product?.digitalFileUrl || null;
          const digitalFileUrl =
            productType === 'digital'
              ? await resolveDigitalDownloadUrl(rawDigitalUrl)
              : null;
          return {
            name: item.product?.name || 'Product',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            type: productType,
            digitalFileUrl,
          };
        })
      ),
      deliveryAddress: {
        address: deliveryAddress.address,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
      },
      deliveryTier: order.deliveryTier
        ? {
            name: order.deliveryTier.name,
            estimatedDays: order.deliveryTier.estimatedDays || undefined,
          }
        : null,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      creatorName: order.creator.displayName,
      sampleTo: sampleTo || undefined,
    });

    if (!result.success) {
      return Response.json(
        { error: ('error' in result && result.error) || 'Email send failed' },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      sentTo: recipientEmail,
      sampleSent: Boolean('sampleSent' in result && result.sampleSent),
      sampleTo: sampleTo || null,
    });
  } catch (error) {
    console.error('[admin/emails/resend] failed:', error);
    return Response.json({ error: 'Failed to resend email' }, { status: 500 });
  }
}
