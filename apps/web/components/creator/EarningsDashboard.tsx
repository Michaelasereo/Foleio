'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Landmark,
  Loader2,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { EmptyState } from '@/components/demo/EmptyState';
import { formatNaira } from '@foleio/utils';
import { type BankAccount } from '@/components/creator/BankSetupForm';
import { PayoutSetupFlow } from '@/components/creator/PayoutSetupFlow';
import { EarningsLoadingSkeleton } from '@/components/creator/EarningsLoadingSkeleton';
import { EarningsLive, PayoutsLive, type EarningsView } from '@/components/creator/earnings-live';

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
    fullPayments?: number;
    deposits?: number;
    outstanding?: number;
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
    fullPayments: 0,
    deposits: 0,
    outstanding: 0,
    settledToBank: 0,
  },
};

function badgeTone(status: string) {
  const s = status.toUpperCase();
  if (s === 'PENDING') return 'is-info';
  if (s === 'PROCESSING') return 'is-info';
  if (s === 'DEPOSIT_PAID' || s === 'BALANCE_OVERDUE') return 'is-info';
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
  if (type === 'booking') return 'Full payments';
  if (type === 'deposit') return 'Deposits';
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

export function EarningsDashboard({
  hideHeader = false,
  presentation = 'earnings',
  onView,
}: {
  hideHeader?: boolean;
  presentation?: 'earnings' | 'payouts';
  onView?: (view: EarningsView) => void;
}) {
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
  const [period, setPeriod] = useState<'all' | 'month' | 'quarter'>('all');

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

  const visibleTransactions = useMemo(() => {
    const rows = data?.transactions || [];
    if (period === 'all') return rows;
    const now = new Date();
    const start =
      period === 'month'
        ? new Date(now.getFullYear(), now.getMonth(), 1).getTime()
        : now.getTime() - 90 * 24 * 60 * 60 * 1000;
    return rows.filter((transaction) => new Date(transaction.createdAt).getTime() >= start);
  }, [data, period]);

  if (state === 'loading' && !data) {
    return <EarningsLoadingSkeleton />;
  }

  if (state === 'error' && !data?.creator) {
    return (
      <div>
        {hideHeader ? null : <h1 className="foleio-auth-title">Earnings</h1>}
        <p className="foleio-dash-panel-meta" style={{ marginTop: hideHeader ? 0 : 8 }}>
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
  const fullPayments = Number(earnings.stats?.fullPayments ?? 0);
  const deposits = Number(earnings.stats?.deposits ?? 0);
  const outstanding = Number(earnings.stats?.outstanding ?? 0);

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

  const view: EarningsView = presentation === 'payouts' ? 'payouts' : 'earnings';
  const bankEditor = earnings.creator.id && earnings.creator.userId && (!creatorBank || editingBank) ? (
    <div style={{ marginTop: 16 }}>
      <PayoutSetupFlow
        creatorId={earnings.creator.id}
        userId={earnings.creator.userId}
        email={earnings.creator.email}
        firstName={earnings.creator.displayName?.split(/\s+/)[0] || null}
        lastName={earnings.creator.displayName?.split(/\s+/).slice(1).join(' ') || null}
        identityVerified={identityVerified}
        requireDojahKyc={requireDojahKyc}
        bankAccount={creatorBank}
        editingBank={editingBank || !creatorBank}
        onIdentityVerified={() => {
          setIdentityVerified(true);
          setData((prev) =>
            prev
              ? { ...prev, creator: { ...prev.creator, bvnVerified: true } }
              : prev
          );
          void loadEarnings();
        }}
        onBankSaved={(bank) => {
          setCreatorBank(bank);
          setEditingBank(false);
          setData((prev) =>
            prev
              ? { ...prev, creator: { ...prev.creator, bankAccount: bank } }
              : prev
          );
          void loadEarnings();
        }}
        onCancelBankEdit={creatorBank ? () => setEditingBank(false) : undefined}
      />
    </div>
  ) : null;

  if (view === 'payouts') {
    return (
      <PayoutsLive
        view={view}
        onView={onView}
        transactions={earnings.transactions}
        bank={creatorBank}
        onEditBank={() => setEditingBank(true)}
        bankEditor={bankEditor}
        onExport={() => void handleExport()}
        exporting={exporting}
      />
    );
  }

  return (
    <EarningsLive
      view={view}
      onView={onView}
      transactions={earnings.transactions}
      monthlyEarnings={earnings.monthlyEarnings}
      outstanding={outstanding}
      plan={earnings.creator.platformPlan}
      onExport={() => void handleExport()}
      exporting={exporting}
    />
  );
}
