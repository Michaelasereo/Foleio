'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  getBookingPaymentPolicy,
  updateBookingPaymentPolicy,
} from '@/lib/actions/booking-policy';
import type { CancellationTier } from '@/lib/booking/cancellation-policy';

export function BookingPolicySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [balanceDueDaysBefore, setBalanceDueDaysBefore] = useState('7');
  const [tiers, setTiers] = useState<CancellationTier[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const result = await getBookingPaymentPolicy();
      if (!mounted) return;
      if (result.success && result.data) {
        setBalanceDueDaysBefore(String(result.data.balanceDueDaysBefore));
        setTiers(result.data.cancellationPolicy);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function updateTier(index: number, patch: Partial<CancellationTier>) {
    setTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, ...patch } : tier))
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    const days = Number(balanceDueDaysBefore);
    if (!Number.isFinite(days) || days < 0) {
      setError('Balance due days must be 0 or more.');
      return;
    }

    setSaving(true);
    try {
      const result = await updateBookingPaymentPolicy({
        balanceDueDaysBefore: Math.floor(days),
        cancellationPolicy: tiers.map((tier) => ({
          minDaysBefore: Math.floor(Number(tier.minDaysBefore) || 0),
          maxDaysBefore:
            tier.maxDaysBefore === null || tier.maxDaysBefore === undefined
              ? null
              : Math.floor(Number(tier.maxDaysBefore)),
          refundPercent: Math.floor(Number(tier.refundPercent) || 0),
        })),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="foleio-dash-panel">
        <p className="foleio-dash-empty">Loading payment policy…</p>
      </div>
    );
  }

  return (
    <div className="foleio-dash-panel">
      <h2 className="foleio-dash-panel-title">Deposits &amp; cancellations</h2>
      <p className="foleio-dash-panel-meta">
        Balance due timing and refund windows apply across your bookable packages.
        Enable deposits per service.
      </p>

      <form
        onSubmit={handleSave}
        style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}
      >
        <label className="foleio-dash-field">
          Balance due (days before service)
          <input
            className="foleio-dash-input"
            type="number"
            min={0}
            value={balanceDueDaysBefore}
            onChange={(e) => setBalanceDueDaysBefore(e.target.value)}
          />
        </label>

        <div className="foleio-dash-field">
          <span>Cancellation refund tiers</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {tiers.map((tier, index) => (
              <div
                key={`${tier.minDaysBefore}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 8,
                }}
              >
                <label className="foleio-dash-field" style={{ margin: 0 }}>
                  Min days before
                  <input
                    className="foleio-dash-input"
                    type="number"
                    min={0}
                    value={tier.minDaysBefore}
                    onChange={(e) =>
                      updateTier(index, {
                        minDaysBefore: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="foleio-dash-field" style={{ margin: 0 }}>
                  Max days (blank = open)
                  <input
                    className="foleio-dash-input"
                    type="number"
                    min={0}
                    value={tier.maxDaysBefore ?? ''}
                    onChange={(e) =>
                      updateTier(index, {
                        maxDaysBefore:
                          e.target.value.trim() === ''
                            ? null
                            : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="foleio-dash-field" style={{ margin: 0 }}>
                  Refund %
                  <input
                    className="foleio-dash-input"
                    type="number"
                    min={0}
                    max={100}
                    value={tier.refundPercent}
                    onChange={(e) =>
                      updateTier(index, {
                        refundPercent: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <p className="foleio-dash-panel-meta" style={{ color: '#fca5a5', margin: 0 }}>
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="foleio-dash-panel-meta" style={{ margin: 0 }}>
            Policy saved.
          </p>
        ) : null}

        <div>
          <button type="submit" className="foleio-dash-btn-primary" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : null}
            Save policy
          </button>
        </div>
      </form>
    </div>
  );
}
