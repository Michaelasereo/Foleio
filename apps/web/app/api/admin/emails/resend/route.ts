import { getAdminIdFromRequest, isAdminAuthed } from '@/lib/admin/auth';
import { prisma } from '@foleio/database';
import { sendBookingConfirmationEmail } from '@/lib/actions/email';
import { sendConfirmedShopOrderEmails } from '@/lib/shop/fulfill-order';

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

    // shop_order — buyer + gift recipient + gift cards + merchant
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        deliveryAddress: true,
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

    const result = await sendConfirmedShopOrderEmails(order.id);
    if (!result.success) {
      return Response.json(
        {
          error:
            result.reason === 'no_email'
              ? 'Order has no customer email on file'
              : 'Email send failed',
        },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      sentTo: result.to || recipientEmail,
      creatorNotified: Boolean(result.creatorNotified),
      sampleSent: false,
      sampleTo: sampleTo || null,
    });
  } catch (error) {
    console.error('[admin/emails/resend] failed:', error);
    return Response.json({ error: 'Failed to resend email' }, { status: 500 });
  }
}
