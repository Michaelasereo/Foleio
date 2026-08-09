'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type ModuleKey = 'fixedBookingsEnabled' | 'customQuotesEnabled' | 'shopEnabled';

export function OfferingsSettings() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ModuleKey | 'phone' | null>(null);
  const [fixedBookingsEnabled, setFixedBookingsEnabled] = useState(true);
  const [customQuotesEnabled, setCustomQuotesEnabled] = useState(false);
  const [shopEnabled, setShopEnabled] = useState(true);
  const [quoteWhatsappPhone, setQuoteWhatsappPhone] = useState('');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch('/api/creator/offerings', { cache: 'no-store' });
        const data = await res.json();
        if (!mounted || !res.ok) return;
        setFixedBookingsEnabled(data.fixedBookingsEnabled !== false);
        setCustomQuotesEnabled(Boolean(data.customQuotesEnabled));
        setShopEnabled(data.shopEnabled !== false);
        setQuoteWhatsappPhone(data.quoteWhatsappPhone || '');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function patchOfferings(body: {
    fixedBookingsEnabled: boolean;
    customQuotesEnabled: boolean;
    shopEnabled: boolean;
    quoteWhatsappPhone: string | null;
  }) {
    const res = await fetch('/api/creator/offerings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save');
    router.refresh();
  }

  async function toggleModule(key: ModuleKey, next: boolean) {
    const prev = {
      fixedBookingsEnabled,
      customQuotesEnabled,
      shopEnabled,
    };
    const nextState = { ...prev, [key]: next };
    if (key === 'fixedBookingsEnabled') setFixedBookingsEnabled(next);
    if (key === 'customQuotesEnabled') setCustomQuotesEnabled(next);
    if (key === 'shopEnabled') setShopEnabled(next);

    setSavingKey(key);
    try {
      await patchOfferings({
        ...nextState,
        quoteWhatsappPhone: quoteWhatsappPhone.trim() || null,
      });
    } catch (error) {
      if (key === 'fixedBookingsEnabled') setFixedBookingsEnabled(prev.fixedBookingsEnabled);
      if (key === 'customQuotesEnabled') setCustomQuotesEnabled(prev.customQuotesEnabled);
      if (key === 'shopEnabled') setShopEnabled(prev.shopEnabled);
      toast({
        title: 'Could not update module',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function savePhone() {
    setSavingKey('phone');
    try {
      await patchOfferings({
        fixedBookingsEnabled,
        customQuotesEnabled,
        shopEnabled,
        quoteWhatsappPhone: quoteWhatsappPhone.trim() || null,
      });
      toast({ title: 'WhatsApp number saved' });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save',
        variant: 'destructive',
      });
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="foleio-dash-panel" style={{ maxWidth: 560 }}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const rows = [
    {
      key: 'fixedBookingsEnabled' as const,
      label: 'Fixed bookings',
      hint: 'Calendar services with Book now',
      value: fixedBookingsEnabled,
    },
    {
      key: 'customQuotesEnabled' as const,
      label: 'Custom quotes',
      hint: 'Quote requests & invoices in your dashboard',
      value: customQuotesEnabled,
    },
    {
      key: 'shopEnabled' as const,
      label: 'Shop',
      hint: 'Products and delivery on your profile',
      value: shopEnabled,
    },
  ];

  return (
    <div className="foleio-dash-panel" style={{ maxWidth: 560 }}>
      <h2 className="foleio-dash-panel-title">Modules</h2>
      <p className="foleio-dash-panel-meta">
        Control what appears on your public page and in your dashboard. Toggles save
        automatically.
      </p>

      {rows.map((row) => (
        <div
          key={row.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ color: '#111827', fontWeight: 500 }}>{row.label}</div>
            <div className="foleio-dash-panel-meta" style={{ margin: 0 }}>
              {row.hint}
            </div>
          </div>
          <button
            type="button"
            className={`foleio-avail-toggle${row.value ? ' is-on' : ''}`}
            aria-pressed={row.value}
            disabled={savingKey === row.key}
            onClick={() => void toggleModule(row.key, !row.value)}
          >
            <span className="foleio-avail-toggle-knob" />
          </button>
        </div>
      ))}

      <div className="foleio-dash-field" style={{ marginTop: 20, marginBottom: 16 }}>
        <label className="foleio-dash-label" htmlFor="quote-wa">
          Business WhatsApp (for quotes)
        </label>
        <input
          id="quote-wa"
          className="foleio-dash-input"
          value={quoteWhatsappPhone}
          onChange={(e) => setQuoteWhatsappPhone(e.target.value)}
          placeholder="08141294589 or 2348141294589"
        />
        <p className="foleio-dash-field-hint">
          Shown on quote requests so clients can message you.
        </p>
      </div>

      <button
        type="button"
        className="foleio-dash-btn-primary"
        disabled={savingKey === 'phone'}
        onClick={() => void savePhone()}
      >
        {savingKey === 'phone' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {savingKey === 'phone' ? 'Saving…' : 'Save WhatsApp'}
      </button>
    </div>
  );
}
