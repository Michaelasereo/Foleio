'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';

type ReviewContext = {
  kind: 'booking' | 'order';
  creatorName: string;
  customerName: string;
  alreadyReviewed: boolean;
  lines: Array<{ name: string; label: string }>;
};

export default function ReviewPage() {
  const params = useParams();
  const token = String(params?.token || '');
  const [ctx, setCtx] = useState<ReviewContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(5);
  const [quote, setQuote] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/review/${encodeURIComponent(token)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Invalid review link');
        if (!cancelled) {
          setCtx(data);
          if (data.alreadyReviewed) setDone(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Invalid review link');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const grouped = useMemo(() => {
    if (!ctx) return [] as Array<{ label: string; names: string[] }>;
    const map = new Map<string, string[]>();
    for (const line of ctx.lines) {
      const list = map.get(line.label) || [];
      list.push(line.name);
      map.set(line.label, list);
    }
    return [...map.entries()].map(([label, names]) => ({ label, names }));
  }, [ctx]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!quote.trim()) {
      setError('Please add a short comment');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/review/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, quote, location: location.trim() || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit review');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0f0f10',
        color: '#f4f4f5',
        padding: '48px 20px',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: '0.08em', opacity: 0.55 }}>
          FOLEIO
        </p>
        <h1 style={{ margin: '12px 0 8px', fontSize: 28, fontWeight: 600 }}>
          {done ? 'Thank you' : 'Leave a review'}
        </h1>
        {loading ? (
          <p style={{ opacity: 0.7 }}>Loading…</p>
        ) : error && !ctx ? (
          <p style={{ color: '#fca5a5' }}>{error}</p>
        ) : done ? (
          <p style={{ opacity: 0.8 }}>
            Your review for {ctx?.creatorName} was submitted.
          </p>
        ) : ctx ? (
          <form onSubmit={submit} style={{ display: 'grid', gap: 16, marginTop: 20 }}>
            <p style={{ margin: 0, opacity: 0.8 }}>
              Hi {ctx.customerName} — how was your experience with{' '}
              <strong>{ctx.creatorName}</strong>?
            </p>

            {grouped.length > 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {grouped.map((group) => (
                  <div key={group.label}>
                    <p
                      style={{
                        margin: '0 0 4px',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        opacity: 0.55,
                      }}
                    >
                      {group.label}
                    </p>
                    <p style={{ margin: 0, fontSize: 14 }}>{group.names.join(', ')}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} stars`}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    border:
                      rating >= star
                        ? '1px solid rgba(255,255,255,0.45)'
                        : '1px solid rgba(255,255,255,0.12)',
                    background:
                      rating >= star ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color: '#f4f4f5',
                    cursor: 'pointer',
                    fontSize: 18,
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={quote}
              onChange={(event) => setQuote(event.target.value)}
              placeholder="Share a short comment"
              rows={4}
              required
              style={{
                width: '100%',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.04)',
                color: '#f4f4f5',
                padding: 12,
                resize: 'vertical',
              }}
            />
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="City (optional)"
              style={{
                width: '100%',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.04)',
                color: '#f4f4f5',
                padding: 12,
              }}
            />
            {error ? <p style={{ margin: 0, color: '#fca5a5' }}>{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              style={{
                height: 44,
                borderRadius: 10,
                border: 'none',
                background: '#f4f4f5',
                color: '#111',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Sending…' : 'Submit review'}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
