'use client';

import { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export function QuotePayClient({
  token,
  status,
  convertedBookingId,
  convertedOrderId,
  whatsappUrl,
  paidHint,
  variant = 'dark',
}: {
  token: string;
  status: string;
  convertedBookingId?: string | null;
  convertedOrderId?: string | null;
  whatsappUrl?: string | null;
  paidHint?: boolean;
  variant?: 'dark' | 'invoice';
}) {
  const [loading, setLoading] = useState<'pay' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(status === 'declined');

  const canPay = ['sent', 'accepted'].includes(status) && !declined;
  const paid =
    status === 'deposit_paid' ||
    Boolean(convertedBookingId) ||
    Boolean(convertedOrderId);
  const invoice = variant === 'invoice';

  async function pay() {
    setLoading('pay');
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${token}/pay`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }
      throw new Error('No payment URL returned');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setLoading(null);
    }
  }

  async function decline() {
    if (!window.confirm('Decline this quote?')) return;
    setLoading('decline');
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${token}/decline`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not decline');
      setDeclined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not decline');
    } finally {
      setLoading(null);
    }
  }

  if (paid) {
    return (
      <div>
        <p style={{ marginBottom: 12, color: invoice ? '#111827' : undefined }}>
          Payment received. Your booking is confirmed.
        </p>
        {convertedBookingId ? (
          <p
            style={{
              color: invoice ? '#6b7280' : '#adadad',
              fontSize: 14,
            }}
          >
            Check your email for the tracking link.
          </p>
        ) : null}
        {paidHint ? (
          <p
            style={{
              color: invoice ? '#6b7280' : '#adadad',
              fontSize: 14,
              marginTop: 8,
            }}
          >
            If payment just completed, refresh in a moment if this still shows pending.
          </p>
        ) : null}
      </div>
    );
  }

  if (declined) {
    return (
      <p style={{ color: invoice ? '#111827' : undefined }}>
        You declined this quote.
      </p>
    );
  }

  if (!canPay) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: invoice ? '#111827' : '#f4f4f5',
            }}
          >
            <MessageCircle className="h-4 w-4" /> Message on WhatsApp
          </a>
        ) : null}
        <Link href="/" style={{ color: invoice ? '#6b7280' : '#adadad' }}>
          Back to Foleio
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {error ? (
        <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void pay()}
        disabled={loading !== null}
        style={{
          width: '100%',
          background: invoice ? '#111827' : '#f4f4f5',
          color: invoice ? '#fcfafb' : '#1a1816',
          border: 'none',
          borderRadius: 6,
          padding: '12px 16px',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {loading === 'pay' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : null}
        Pay here
      </button>
      <button
        type="button"
        onClick={() => void decline()}
        disabled={loading !== null}
        style={{
          width: '100%',
          background: 'transparent',
          color: invoice ? '#6b7280' : '#adadad',
          border: invoice ? '1px solid #e5e3e6' : '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6,
          padding: '10px 16px',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        Decline
      </button>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: invoice ? '#6b7280' : '#adadad',
            marginTop: 4,
            fontSize: 13,
          }}
        >
          <MessageCircle className="h-4 w-4" /> Need changes? WhatsApp
        </a>
      ) : null}
    </div>
  );
}
