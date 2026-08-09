import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  creatorId: z.string().uuid(),
  linkedServiceId: z.string().uuid().optional().nullable(),
  customerName: z.string().min(2).max(120),
  customerEmail: z.string().email(),
  customerPhone: z.string().max(30).optional().nullable(),
  preferredDate: z.string().optional().nullable(),
  budgetMinKobo: z.number().int().nonnegative().optional().nullable(),
  budgetMaxKobo: z.number().int().nonnegative().optional().nullable(),
  brief: z.string().min(10).max(5000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const creator = await prisma.creator.findUnique({
      where: { id: data.creatorId },
      select: {
        id: true,
        customQuotesEnabled: true,
        displayName: true,
        quoteWhatsappPhone: true,
        user: { select: { phoneNumber: true, email: true } },
      },
    });

    if (!creator || !creator.customQuotesEnabled) {
      return NextResponse.json(
        { error: 'This creator is not accepting quote requests' },
        { status: 400 }
      );
    }

    if (data.linkedServiceId) {
      const service = await prisma.priceListItem.findFirst({
        where: {
          id: data.linkedServiceId,
          creatorId: creator.id,
          isActive: true,
        },
        select: { id: true },
      });
      if (!service) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }
    }

    const preferredDate = data.preferredDate
      ? new Date(data.preferredDate)
      : null;

    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        creatorId: creator.id,
        linkedServiceId: data.linkedServiceId || null,
        customerName: data.customerName.trim(),
        customerEmail: data.customerEmail.trim().toLowerCase(),
        customerPhone: (data.customerPhone || '').trim() || '',
        preferredDate:
          preferredDate && !Number.isNaN(preferredDate.getTime())
            ? preferredDate
            : null,
        budgetMinKobo: data.budgetMinKobo ?? null,
        budgetMaxKobo: data.budgetMaxKobo ?? null,
        brief: data.brief.trim(),
        status: 'open',
      },
    });

    // Soft notify merchant (best-effort)
    try {
      const { sendEmail } = await import('@/lib/email/resend');
      const merchantEmail = creator.user?.email;
      if (merchantEmail) {
        await sendEmail({
          to: merchantEmail,
          subject: `New quote request from ${quoteRequest.customerName}`,
          html: `<p>${quoteRequest.customerName} requested a quote.</p><p>${quoteRequest.brief.slice(0, 400)}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'}/invoices?tab=requests">Open quote requests</a></p>`,
        });
      }
    } catch (err) {
      console.error('Quote request merchant notify failed:', err);
    }

    return NextResponse.json({
      request: {
        id: quoteRequest.id,
        status: quoteRequest.status,
      },
      merchantWhatsappPhone:
        creator.quoteWhatsappPhone || creator.user?.phoneNumber || null,
    });
  } catch (error) {
    console.error('POST /api/quotes/request', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
