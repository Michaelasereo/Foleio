import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@foleio/database';
import { whatsappChatUrl } from '@/lib/quotes/helpers';
import { QuotePayClient } from '@/components/quotes/QuotePayClient';
import { PublicInvoiceView } from '@/components/quotes/PublicInvoiceView';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function PublicQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const sp = (await searchParams) || {};

  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          quoteWhatsappPhone: true,
          user: { select: { phoneNumber: true, email: true } },
        },
      },
    },
  });

  if (!quote) notFound();

  let status = quote.status;
  if (
    ['sent', 'accepted'].includes(quote.status) &&
    quote.validUntil &&
    new Date(quote.validUntil) < new Date()
  ) {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'expired' },
    });
    status = 'expired';
  }

  let newerSiblingToken: string | null = null;
  if (status === 'expired' && quote.quoteRequestId) {
    const newer = await prisma.quote.findFirst({
      where: {
        quoteRequestId: quote.quoteRequestId,
        status: { in: ['sent', 'accepted'] },
        id: { not: quote.id },
      },
      orderBy: { createdAt: 'desc' },
      select: { publicToken: true },
    });
    newerSiblingToken = newer?.publicToken || null;
  }

  const merchantPhone =
    quote.creator.quoteWhatsappPhone || quote.creator.user?.phoneNumber || null;
  const waUrl = whatsappChatUrl(
    merchantPhone,
    `Hi ${quote.creator.displayName}, I have a question about quote: ${quote.title}`
  );

  const lineItems = Array.isArray(quote.lineItems)
    ? (quote.lineItems as Array<{ id: string; label: string; amountKobo: number }>)
    : [];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f3f4',
        color: '#111827',
        padding: '32px 16px 64px',
        fontFamily: 'var(--font-body), sans-serif',
      }}
    >
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
          Invoice from{' '}
          <Link
            href={`/creator/${quote.creator.username}`}
            style={{ color: '#111827', fontWeight: 600 }}
          >
            {quote.creator.displayName}
          </Link>
          {sp.paid === '1' ? ' · payment submitted' : ''}
        </p>

        {status === 'expired' ? (
          <div
            style={{
              padding: 16,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <p style={{ margin: 0 }}>This invoice has expired or been replaced.</p>
            {newerSiblingToken ? (
              <p style={{ marginTop: 12 }}>
                <Link href={`/quote/${newerSiblingToken}`}>
                  View the updated invoice →
                </Link>
              </p>
            ) : waUrl ? (
              <p style={{ marginTop: 12 }}>
                <a href={waUrl} target="_blank" rel="noreferrer">
                  Message on WhatsApp
                </a>
              </p>
            ) : null}
          </div>
        ) : null}

        <PublicInvoiceView
          quote={{
            id: quote.id,
            title: quote.title,
            status,
            customerName: quote.customerName,
            customerEmail: quote.customerEmail,
            customerPhone: quote.customerPhone,
            customerAddress: quote.customerAddress,
            serviceDate: quote.serviceDate?.toISOString() || null,
            validUntil: quote.validUntil?.toISOString() || null,
            notes: quote.notes,
            lineItems,
            totalAmount: quote.totalAmount,
            depositAmount: quote.depositAmount,
            balanceAmount: quote.balanceAmount,
            deliveryFeeMode: quote.deliveryFeeMode,
            deliveryTierId: quote.deliveryTierId,
            deliveryFeeKobo: quote.deliveryFeeKobo,
            companyName: quote.creator.displayName,
            companyEmail: quote.creator.user?.email || '',
            companyPhone: merchantPhone || '',
          }}
          paySlot={
            <QuotePayClient
              token={quote.publicToken}
              status={status}
              convertedBookingId={quote.convertedBookingId}
              convertedOrderId={quote.convertedOrderId}
              whatsappUrl={waUrl}
              paidHint={sp.paid === '1'}
              variant="invoice"
            />
          }
        />
      </div>
    </div>
  );
}
