import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';
import { defaultValidUntil, whatsappChatUrl } from '@/lib/quotes/helpers';
import { resolveHybridQuoteFields } from '@/lib/quotes/hybrid-invoice';
import { sendQuoteSentEmail } from '@/lib/email/send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';

export async function POST(request: Request, context: RouteContext) {
  const access = await assertCreatorApiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const quote = await prisma.quote.findFirst({
    where: { id, creatorId: access.access.creator.id },
  });
  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  if (['deposit_paid', 'declined'].includes(quote.status)) {
    return NextResponse.json(
      { error: `Cannot send a ${quote.status} quote` },
      { status: 400 }
    );
  }

  const hybrid = await resolveHybridQuoteFields({
    creatorId: access.access.creator.id,
    lineItemsRaw: quote.lineItems,
    linkedServiceId: quote.linkedServiceId,
    serviceDateRaw: quote.serviceDate,
    delivery: {
      deliveryFeeMode: quote.deliveryFeeMode,
      deliveryTierId: quote.deliveryTierId,
      deliveryFeeKobo: quote.deliveryFeeKobo,
    },
  });
  if (!hybrid.ok) {
    return NextResponse.json({ error: hybrid.error }, { status: 400 });
  }

  if (
    hybrid.data.deliveryFeeKobo !== quote.deliveryFeeKobo ||
    hybrid.data.totalAmount !== quote.totalAmount
  ) {
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        deliveryFeeKobo: hybrid.data.deliveryFeeKobo,
        totalAmount: hybrid.data.totalAmount,
        depositAmount:
          quote.balanceAmount > 0 ? quote.depositAmount : hybrid.data.totalAmount,
        balanceAmount:
          quote.balanceAmount > 0
            ? Math.max(0, hybrid.data.totalAmount - quote.depositAmount)
            : 0,
      },
    });
  }

  if (!hybrid.data.totalAmount || hybrid.data.totalAmount < 10000) {
    return NextResponse.json(
      { error: 'Quote total must be at least ₦100' },
      { status: 400 }
    );
  }
  if (!quote.customerEmail || !quote.customerName) {
    return NextResponse.json(
      { error: 'Customer name and email are required' },
      { status: 400 }
    );
  }

  const creator = await prisma.creator.findUnique({
    where: { id: access.access.creator.id },
    select: {
      displayName: true,
      username: true,
      quoteWhatsappPhone: true,
      user: { select: { phoneNumber: true, email: true } },
    },
  });

  const isResend = quote.status === 'sent' || quote.status === 'accepted';
  const validUntil =
    quote.validUntil && quote.validUntil > new Date()
      ? quote.validUntil
      : defaultValidUntil();

  const supersedeWhere = quote.quoteRequestId
    ? {
        creatorId: quote.creatorId,
        id: { not: quote.id },
        quoteRequestId: quote.quoteRequestId,
        status: { in: ['sent', 'accepted', 'draft'] },
      }
    : {
        creatorId: quote.creatorId,
        id: { not: quote.id },
        customerEmail: quote.customerEmail,
        status: { in: ['sent', 'accepted'] },
        convertedBookingId: null,
        convertedOrderId: null,
      };

  const priorLive = await prisma.quote.findMany({
    where: supersedeWhere,
    select: { id: true },
  });

  if (priorLive.length > 0) {
    await prisma.quote.updateMany({
      where: { id: { in: priorLive.map((q) => q.id) } },
      data: { status: 'expired' },
    });
  }

  const updated = await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: 'sent',
      validUntil,
      supersedesQuoteId: priorLive[0]?.id || quote.supersedesQuoteId,
    },
  });

  if (quote.quoteRequestId) {
    await prisma.quoteRequest.update({
      where: { id: quote.quoteRequestId },
      data: { status: 'quoted' },
    });
  }

  const quoteUrl = `${APP_URL.replace(/\/$/, '')}/quote/${updated.publicToken}`;
  const merchantPhone =
    creator?.quoteWhatsappPhone || creator?.user?.phoneNumber || null;

  const emailType = isResend ? 'quote_updated' : 'quote_sent';
  const alreadyLogged = await prisma.quoteEmailLog.findUnique({
    where: {
      quoteId_emailType: { quoteId: updated.id, emailType },
    },
  });

  if (!alreadyLogged || isResend) {
    await sendQuoteSentEmail({
      customerEmail: updated.customerEmail,
      customerName: updated.customerName,
      creatorName: creator?.displayName || 'Creator',
      quoteTitle: updated.title,
      totalAmount: updated.totalAmount,
      depositAmount: updated.depositAmount,
      balanceAmount: updated.balanceAmount,
      validUntilLabel: validUntil.toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      quoteUrl,
      isUpdate: isResend,
    });

    if (!alreadyLogged) {
      await prisma.quoteEmailLog.create({
        data: { quoteId: updated.id, emailType },
      });
    } else if (isResend) {
      await prisma.quoteEmailLog.upsert({
        where: {
          quoteId_emailType: { quoteId: updated.id, emailType: 'quote_updated' },
        },
        create: { quoteId: updated.id, emailType: 'quote_updated' },
        update: { sentAt: new Date() },
      });
    }
  }

  const shareText = `Hi ${updated.customerName}, here is your quote from ${creator?.displayName || 'me'}: ${quoteUrl}`;
  const whatsappShareUrl = whatsappChatUrl(updated.customerPhone, shareText);

  return NextResponse.json({
    quote: updated,
    quoteUrl,
    whatsappShareUrl,
    merchantWhatsappUrl: whatsappChatUrl(merchantPhone),
    supersededCount: priorLive.length,
  });
}
