'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Download,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { formatNaira } from '@foleio/utils';
import { type BankAccount } from '@/components/creator/BankSetupForm';
import { PayoutSetupFlow } from '@/components/creator/PayoutSetupFlow';

type EarningsPayload = {
  creator: {
    id?: string | null;
    userId?: string | null;
    totalEarned: number;
    platformPlan: string | null;
    bankAccount: BankAccount | null;
    bvnVerified?: boolean;
    identityVerifiedAt?: string | null;
    email?: string | null;
    displayName?: string | null;
    paystackSubaccountCode?: string | null;
    subaccountStatus?: string | null;
  };
  requireDojahKyc?: boolean;
  monthlyEarnings: Array<{ month: string; amount: number }>;
  byStream: Array<{ type: string; amount: number }>;
  transactions: Array<{
    id: string;
    createdAt: string;
    status: string;
    type: string;
    amount: number | string;
    creatorEarnings?: number | string | null;
    platformFee?: number | string | null;
    reference?: string | null;
    metadata?: {
      service?: string;
      customerName?: string;
      bookingId?: string;
    };
  }>;
  stats?: {
    totalEarnings: number;
    settledToBank?: number;
    platformFeePercent?: number;
  };
  error?: string;
};

type TabId = 'transactions' | 'account';
type LoadState = 'loading' | 'ready' | 'error';

const EMPTY_EARNINGS: EarningsPayload = {
  creator: {
    id: null,
    userId: null,
    totalEarned: 0,
    platformPlan: null,
    bankAccount: null,
    bvnVerified: false,
    identityVerifiedAt: null,
    email: null,
    displayName: null,
  },
  monthlyEarnings: [],
  byStream: [],
  transactions: [],
  stats: {
    totalEarnings: 0,
    settledToBank: 0,
  },
};

function badgeTone(status: string) {
  const s = status.toUpperCase();
  if (s === 'PENDING') return 'is-info';
  if (s === 'PROCESSING') return 'is-info';
  if (
    s === 'SUCCESS' ||
    s === 'COMPLETED' ||
    s === 'PAID' ||
    s === 'FIRST_PAYOUT_DONE' ||
    s === 'SERVICE_DAY'
  ) {
    return 'is-success';
  }
  if (s === 'FAILED' || s === 'CANCELLED' || s === 'CANCELED' || s === 'REFUNDED') {
    return 'is-danger';
  }
  return 'is-muted';
}

function streamLabel(type: string) {
  if (type === 'subscription') return 'Subscriptions';
  if (type === 'booking') return 'Bookings';
  if (type === 'one_time') return 'Content sales';
  return type.replace(/_/g, ' ');
}

function normalizeBank(raw: any): BankAccount | null {
  if (!raw) return null;
  return {
    id: String(raw.id || ''),
    bankCode: String(raw.bankCode || ''),
    bankName: String(raw.bankName || ''),
    accountNumber: String(raw.accountNumber || ''),
    accountName: String(raw.accountName || ''),
    recipientCode: raw.recipientCode ?? null,
    isVerified: raw.isVerified ?? true,
  };
}

export function EarningsDashboard() {
  const [data, setData] = useState<EarningsPayload | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const [tab, setTab] = useState<TabId>('transactions');
  const [tabInitialized, setTabInitialized] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [creatorBank, setCreatorBank] = useState<BankAccount | null>(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [requireDojahKyc, setRequireDojahKyc] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadEarnings = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/creator/earnings', {
      cache: 'no-store',
      signal,
    });
    const payload = (await response.json()) as EarningsPayload;

    // Soft-accept: API may return 500 with empty creator payload
    if (!response.ok && !payload?.creator && !payload?.stats) {
      throw new Error(payload?.error || 'Failed to load earnings');
    }

    const normalized: EarningsPayload = {
      ...EMPTY_EARNINGS,
      ...payload,
      creator: {
        ...EMPTY_EARNINGS.creator,
        ...(payload.creator || {}),
        bankAccount: normalizeBank(payload.creator?.bankAccount),
      },
      transactions: Array.isArray(payload.transactions) ? payload.transactions : [],
      byStream: Array.isArray(payload.byStream) ? payload.byStream : [],
      monthlyEarnings: Array.isArray(payload.monthlyEarnings)
        ? payload.monthlyEarnings
        : [],
      stats: {
        ...EMPTY_EARNINGS.stats!,
        ...(payload.stats || {}),
      },
    };

    setData(normalized);
    setCreatorBank(normalized.creator.bankAccount);
    setIdentityVerified(Boolean(normalized.creator.bvnVerified));
    setRequireDojahKyc(Boolean(normalized.requireDojahKyc));
    setState('ready');
    return normalized;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');

    loadEarnings(controller.signal).catch((err) => {
      if (err?.name === 'AbortError') return;
      setData(EMPTY_EARNINGS);
      setCreatorBank(null);
      setState('error');
    });

    return () => controller.abort();
  }, [loadEarnings, retryKey]);

  useEffect(() => {
    if (state !== 'ready' || tabInitialized) return;
    const needsKyc = requireDojahKyc && !identityVerified;
    if (!creatorBank || needsKyc) setTab('account');
    setTabInitialized(true);
  }, [state, creatorBank, identityVerified, requireDojahKyc, tabInitialized]);

  const streamRows = useMemo(() => {
    const rows = data?.byStream || [];
    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0) || 1;
    return rows.map((row) => ({
      ...row,
      label: streamLabel(row.type),
      percent: Math.round((Number(row.amount || 0) / total) * 100),
    }));
  }, [data]);

  if (state === 'loading' && !data) {
    return (
      <div>
        <h1 className="foleio-auth-title">Earnings</h1>
        <p
          className="foleio-dash-panel-meta"
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          Loading earnings…
        </p>
      </div>
    );
  }

  if (state === 'error' && !data?.creator) {
    return (
      <div>
        <h1 className="foleio-auth-title">Earnings</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          Could not load earnings right now.
        </p>
        <button
          type="button"
          className="foleio-dash-btn-outline"
          style={{ marginTop: 16 }}
          onClick={() => setRetryKey((prev) => prev + 1)}
        >
          Try again
        </button>
      </div>
    );
  }

  const earnings = data || EMPTY_EARNINGS;
  const totalEarned = Number(
    earnings.stats?.totalEarnings ?? earnings.creator.totalEarned ?? 0
  );
  const settledToBank = Number(earnings.stats?.settledToBank ?? totalEarned);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch('/api/creator/earnings/export');
      if (!response.ok) return;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'foleio-earnings.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const stats = [
    {
      title: 'Total earnings',
      value: formatNaira(totalEarned / 100),
      hint: 'Your share after platform fee',
      icon: TrendingUp,
    },
    {
      title: 'Settled to bank',
      value: formatNaira(settledToBank / 100),
      hint: 'Paid via Paystack split',
      icon: Building2,
    },
  ];

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    {
      id: 'transactions',
      label: 'Transactions',
      count: earnings.transactions.length,
    },
    { id: 'account', label: 'Payout account' },
  ];

  return (
    <div>
      <div className="foleio-dash-header">
        <div>
          <h1 className="foleio-auth-title">Earnings</h1>
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
            Booking payments settle to your bank via Paystack.
          </p>
        </div>
      </div>

      {state === 'error' ? (
        <p className="foleio-dash-panel-meta" style={{ color: '#fca5a5', marginBottom: 12 }}>
          Some earnings data could not be refreshed.{' '}
          <button
            type="button"
            className="foleio-dash-btn-ghost"
            style={{ display: 'inline', padding: 0, height: 'auto' }}
            onClick={() => setRetryKey((prev) => prev + 1)}
          >
            Retry
          </button>
        </p>
      ) : null}

      <div className="foleio-dash-stats">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="foleio-dash-stat">
              <div className="foleio-dash-stat-top">
                <span className="foleio-dash-stat-label">{stat.title}</span>
                <Icon className="foleio-dash-stat-icon h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="foleio-dash-stat-value">{stat.value}</div>
              <p className="foleio-dash-stat-change">{stat.hint}</p>
            </div>
          );
        })}
      </div>

      {streamRows.length > 0 ? (
        <div className="foleio-dash-panel" style={{ marginBottom: 14 }}>
          <h2 className="foleio-dash-panel-title">Earnings by stream</h2>
          <p className="foleio-dash-panel-meta">Last 6 months</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            {streamRows.map((row) => (
              <div key={row.type}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: '#f4f4f5', fontSize: 14, fontWeight: 500 }}>
                    {row.label}
                  </span>
                  <span style={{ color: '#adadad', fontSize: 13, fontWeight: 500 }}>
                    {formatNaira(Number(row.amount) / 100)} · {row.percent}%
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: '#2b2b2b',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${row.percent}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'hsl(var(--accent))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="foleio-dash-tabs" role="tablist" aria-label="Earnings sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`foleio-dash-tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {typeof item.count === 'number' ? (
              <span className="foleio-dash-tab-count">{item.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'transactions' ? (
        <div className="foleio-dash-panel">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <h2 className="foleio-dash-panel-title">Recent transactions</h2>
              <p className="foleio-dash-panel-meta">
                {earnings.transactions.length === 0
                  ? 'Nothing here yet'
                  : `${earnings.transactions.length} recent`}
              </p>
            </div>
            {earnings.transactions.length > 0 ? (
              <button
                type="button"
                className="foleio-dash-btn-outline"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Download className="h-4 w-4" strokeWidth={1.5} />
                )}
                Export
              </button>
            ) : null}
          </div>

          {earnings.transactions.length === 0 ? (
            <p className="foleio-dash-empty">No transactions yet.</p>
          ) : (
            earnings.transactions.slice(0, 20).map((transaction) => {
              const serviceName =
                transaction.metadata?.service ||
                streamLabel(String(transaction.type || 'payment'));
              const customerName = transaction.metadata?.customerName;
              return (
                <div key={transaction.id} className="foleio-dash-booking-row">
                  <div className="foleio-dash-booking-main">
                    <p className="foleio-dash-booking-name">{serviceName}</p>
                    <div className="foleio-dash-booking-meta">
                      <span
                        className={`foleio-dash-badge ${badgeTone(String(transaction.status || 'PENDING'))}`}
                      >
                        {String(transaction.status || 'PENDING')}
                      </span>
                      {customerName ? <span>{customerName}</span> : null}
                      <span>
                        {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="foleio-dash-booking-amount">
                    {formatNaira(Number(transaction.creatorEarnings || 0) / 100)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {tab === 'account' ? (
        <div className="foleio-dash-panel" id="payout-account">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <h2 className="foleio-dash-panel-title">Unlock payouts</h2>
              <p className="foleio-dash-panel-meta">
                {requireDojahKyc
                  ? 'Step 1: verify identity with Dojah. Step 2: add your bank account. Book appears on your public page only after both are done.'
                  : 'Add your bank account so clients can book and you can get paid.'}
              </p>
            </div>
            {(!requireDojahKyc || identityVerified) && creatorBank && !editingBank ? (
              <button
                type="button"
                className="foleio-dash-btn-ghost"
                onClick={() => setEditingBank(true)}
              >
                Change bank
              </button>
            ) : null}
          </div>

          {earnings.creator.id && earnings.creator.userId ? (
            <div style={{ marginTop: 16 }}>
              <PayoutSetupFlow
                creatorId={earnings.creator.id}
                userId={earnings.creator.userId}
                email={earnings.creator.email}
                firstName={earnings.creator.displayName?.split(/\s+/)[0] || null}
                lastName={
                  earnings.creator.displayName?.split(/\s+/).slice(1).join(' ') || null
                }
                identityVerified={identityVerified}
                requireDojahKyc={requireDojahKyc}
                bankAccount={creatorBank}
                editingBank={editingBank}
                onIdentityVerified={() => {
                  setIdentityVerified(true);
                  setData((prev) =>
                    prev
                      ? {
                          ...prev,
                          creator: { ...prev.creator, bvnVerified: true },
                        }
                      : prev
                  );
                  void loadEarnings();
                }}
                onBankSaved={(bank) => {
                  setCreatorBank(bank);
                  setEditingBank(false);
                  setData((prev) =>
                    prev
                      ? {
                          ...prev,
                          creator: { ...prev.creator, bankAccount: bank },
                        }
                      : prev
                  );
                  void loadEarnings();
                }}
                onCancelBankEdit={
                  creatorBank ? () => setEditingBank(false) : undefined
                }
              />
            </div>
          ) : (
            <p className="foleio-dash-panel-meta" style={{ marginTop: 12 }}>
              Could not load creator account details. Refresh and try again.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
