'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export type BankAccount = {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  recipientCode?: string | null;
  isVerified?: boolean;
};

type BankOption = {
  code: string;
  name: string;
};

export function BankSetupForm({
  onSaved,
  onCancel,
}: {
  onSaved: (bank: BankAccount) => void;
  onCancel?: () => void;
}) {
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState<BankOption | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setBanksLoading(true);
    fetch('/api/creator/banks')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setBanks(d.banks || []);
      })
      .catch(() => {
        if (!cancelled) setBanks([]);
      })
      .finally(() => {
        if (!cancelled) setBanksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBanks = useMemo(() => {
    const sorted = [...banks].sort((a, b) => a.name.localeCompare(b.name));
    const q = query.trim().toLowerCase();
    if (!q) return sorted.slice(0, 12);
    return sorted.filter((bank) => bank.name.toLowerCase().includes(q)).slice(0, 12);
  }, [banks, query]);

  useEffect(() => {
    if (accountNumber.length !== 10 || !selectedBank) return;

    let cancelled = false;
    async function verify() {
      setIsVerifying(true);
      setVerifiedName('');
      setError('');

      try {
        const res = await fetch('/api/creator/bank/verify-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountNumber,
            bankCode: selectedBank!.code,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.accountName) {
          setVerifiedName(data.accountName);
        } else {
          setError(data.error || 'Account not found. Check the number and bank.');
        }
      } catch {
        if (!cancelled) setError('Could not verify account. Try again.');
      } finally {
        if (!cancelled) setIsVerifying(false);
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [accountNumber, selectedBank]);

  async function handleSave() {
    if (!verifiedName || !selectedBank) return;
    setIsSaving(true);
    setError('');

    try {
      const res = await fetch('/api/creator/bank/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber,
          bankCode: selectedBank.code,
          bankName: selectedBank.name,
          accountName: verifiedName,
        }),
      });
      const data = await res.json();

      if (data.bankAccount) {
        onSaved(data.bankAccount);
      } else {
        setError(data.error || 'Failed to save. Please try again.');
      }
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label className="foleio-dash-field">
        Search bank
        <input
          type="text"
          className="foleio-dash-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. GTBank, Access, Zenith"
          autoComplete="off"
        />
      </label>

      <div className="foleio-dash-field">
        <span>Bank</span>
        {banksLoading ? (
          <p className="foleio-dash-field-hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
            Loading banks…
          </p>
        ) : filteredBanks.length === 0 ? (
          <p className="foleio-dash-field-hint">No banks match that search.</p>
        ) : (
          <div
            role="listbox"
            aria-label="Banks"
            style={{
              maxHeight: 180,
              overflowY: 'auto',
              borderRadius: 10,
              background: '#f3f1f4',
            }}
          >
            {filteredBanks.map((bank) => {
              const selected = selectedBank?.code === bank.code;
              return (
                <button
                  key={bank.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setSelectedBank(bank);
                    setVerifiedName('');
                    setError('');
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '11px 14px',
                    border: 'none',
                    borderBottom: '1px solid rgba(17, 24, 39, 0.08)',
                    background: selected ? '#ebe8eb' : 'transparent',
                    color: selected ? '#111827' : '#6b7280',
                    fontFamily: 'var(--font-body), sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {bank.name}
                </button>
              );
            })}
          </div>
        )}
        {selectedBank ? (
          <p className="foleio-dash-field-hint">Selected: {selectedBank.name}</p>
        ) : null}
      </div>

      <label className="foleio-dash-field">
        Account number
        <input
          type="text"
          inputMode="numeric"
          maxLength={10}
          className="foleio-dash-input"
          value={accountNumber}
          onChange={(e) => {
            setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
            setVerifiedName('');
            setError('');
          }}
          placeholder="0123456789"
          style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.12em' }}
          disabled={!selectedBank}
        />
        <p className="foleio-dash-field-hint">10-digit NUBAN — we verify the name automatically</p>
      </label>

      {isVerifying ? (
        <p
          className="foleio-dash-panel-meta"
          style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
          Verifying account…
        </p>
      ) : null}

      {verifiedName && !isVerifying ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 0 0',
          }}
        >
          <CheckCircle2
            className="h-4 w-4 shrink-0"
            strokeWidth={1.5}
            style={{ color: '#86efac', marginTop: 2 }}
          />
          <div>
            <p style={{ margin: 0, color: '#111827', fontSize: 14, fontWeight: 600 }}>
              {verifiedName}
            </p>
            <p className="foleio-dash-field-hint" style={{ marginTop: 4 }}>
              Name matched via Paystack — payouts go here
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <AlertCircle
            className="h-4 w-4 shrink-0"
            strokeWidth={1.5}
            style={{ color: '#fca5a5', marginTop: 2 }}
          />
          <p style={{ margin: 0, color: '#fca5a5', fontSize: 13, fontWeight: 500 }}>{error}</p>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
        {onCancel ? (
          <button type="button" className="foleio-dash-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          className="foleio-dash-btn-primary"
          onClick={handleSave}
          disabled={!verifiedName || isSaving}
          style={{ flex: 1 }}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              Saving…
            </>
          ) : (
            'Save account'
          )}
        </button>
      </div>
    </div>
  );
}
