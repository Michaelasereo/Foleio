'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { Loader2, MessageCircle, X } from 'lucide-react';

/** Client-safe WhatsApp helper (digits only). */
function waUrl(phone: string | null | undefined, text?: string) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `234${digits.slice(1)}`;
  }
  if (digits.length === 10 && !digits.startsWith('234')) {
    digits = `234${digits}`;
  }
  const base = `https://wa.me/${digits}`;
  return text?.trim()
    ? `${base}?text=${encodeURIComponent(text.trim())}`
    : base;
}

export function QuoteRequestModal({
  open,
  onOpenChange,
  creatorId,
  creatorName,
  merchantPhone,
  linkedServiceId,
  linkedServiceName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName: string;
  merchantPhone?: string | null;
  linkedServiceId?: string | null;
  linkedServiceName?: string | null;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [brief, setBrief] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const merchantWa = waUrl(
    merchantPhone,
    `Hi ${creatorName}, I'd like to discuss a custom project${
      linkedServiceName ? ` (${linkedServiceName})` : ''
    }.`
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const budgetKobo = budget
        ? Math.round(Number(String(budget).replace(/,/g, '')) * 100)
        : null;
      const res = await fetch('/api/quotes/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          linkedServiceId: linkedServiceId || null,
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          brief: brief.trim(),
          preferredDate: preferredDate || null,
          budgetMinKobo: budgetKobo,
          budgetMaxKobo: budgetKobo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={() => onOpenChange(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#212121',
          borderRadius: 12,
          padding: 20,
          color: '#f4f4f5',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Request a quote</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{ background: 'none', border: 'none', color: '#adadad' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div>
            <p>Request sent. {creatorName} will follow up with a quote.</p>
            {merchantWa ? (
              <a
                href={merchantWa}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 16,
                  color: '#f4f4f5',
                }}
              >
                <MessageCircle className="h-4 w-4" /> Message on WhatsApp
              </a>
            ) : null}
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} style={{ display: 'grid', gap: 12 }}>
            {linkedServiceName ? (
              <p style={{ color: '#adadad', margin: 0, fontSize: 14 }}>
                For: {linkedServiceName}
              </p>
            ) : null}
            {error ? (
              <p style={{ color: '#f87171', margin: 0 }}>{error}</p>
            ) : null}
            <input
              required
              placeholder="Your name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
            <input
              required
              type="email"
              placeholder="Email *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="WhatsApp phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
            />
            <textarea
              required
              placeholder="Brief — what do you need?"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <input
              type="date"
              placeholder="Preferred date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Budget (₦, optional)"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#f4f4f5',
                color: '#1a1816',
                border: 'none',
                borderRadius: 8,
                padding: '12px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit request
            </button>
            {merchantWa ? (
              <a
                href={merchantWa}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#adadad',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle className="h-4 w-4" /> Or message on WhatsApp
              </a>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  background: '#1a1816',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#f4f4f5',
};
