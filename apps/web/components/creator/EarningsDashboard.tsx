'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Clock, TrendingUp, Wallet } from 'lucide-react';
import { formatNaira } from '@foleio/utils';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PayoutModal } from '@/components/creator/PayoutModal';
import { PayoutScheduleSettings } from '@/components/creator/PayoutScheduleSettings';
import { BankSetupForm, type BankAccount } from '@/components/creator/BankSetupForm';

type EarningsPayload = {
  creator: {
    availableBalance: number;
    pendingBalance: string | number;
    totalEarned: number;
    platformPlan: string | null;
    bankAccount: any | null;
    payouts: Array<any>;
  };
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
  }>;
};

const streamColors: Record<string, string> = {
  subscription: '#F97316',
  one_time: '#2563EB',
  booking: '#16A34A',
};

function statusClass(status: string) {
  const s = status.toUpperCase();
  if (s === 'PENDING') return 'bg-amber-100 text-amber-700';
  if (s === 'PROCESSING') return 'bg-blue-100 text-blue-700';
  if (s === 'SUCCESS' || s === 'COMPLETED' || s === 'success') return 'bg-green-100 text-green-700';
  return 'bg-red-100 text-red-700';
}

export function EarningsDashboard() {
  const [data, setData] = useState<EarningsPayload | null>(null);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [editingBank, setEditingBank] = useState(false);
  const [creatorBank, setCreatorBank] = useState<BankAccount | null>(null);

  async function load(signal?: AbortSignal) {
    const response = await fetch('/api/creator/earnings', { cache: 'no-store', signal });
    const payload = (await response.json()) as EarningsPayload & { error?: string };
    if (!response.ok && payload.error && !payload.stats) {
      throw new Error(payload.error);
    }
    setData(payload);
    setCreatorBank(payload.creator?.bankAccount || null);
    setState('ready');
  }

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setState('error');
    }, 10000);

    setState('loading');
    load(controller.signal)
      .catch(() => {
        setState('error');
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [retryKey]);

  const streamRows = useMemo(() => {
    const total = (data?.byStream || []).reduce((sum, row) => sum + Number(row.amount || 0), 0) || 1;
    return (data?.byStream || []).map((row) => ({
      ...row,
      label:
        row.type === 'subscription'
          ? 'Subscriptions'
          : row.type === 'booking'
            ? 'Bookings'
            : 'Content sales',
      percent: Math.round((Number(row.amount || 0) / total) * 100),
      color: streamColors[row.type] || '#6B7280',
    }));
  }, [data]);

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="mb-4 text-muted-foreground">Could not load earnings right now.</p>
        <button
          onClick={() => setRetryKey((prev) => prev + 1)}
          className="text-sm text-primary underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  if (state === 'loading' || !data) {
    return <p className="text-sm text-muted-foreground">Loading earnings...</p>;
  }

  const available = Number(data.creator.availableBalance || 0);
  const pending = Number(data.creator.pendingBalance || 0);
  const totalEarned = Number(data.creator.totalEarned || 0);
  const manualPayoutsEnabled =
    process.env.NEXT_PUBLIC_MANUAL_PAYOUTS_ENABLED === 'true';
  const hasPendingRequest = data.creator.payouts.some((payout) =>
    ['PENDING', 'PROCESSING', 'pending', 'processing'].includes(String(payout.status))
  );
  const canRequestPayout =
    available >= 500000 && !!creatorBank && !hasPendingRequest;

  async function handleRequestPayout() {
    setRequestLoading(true);
    setRequestError('');
    try {
      const response = await fetch('/api/creator/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: available }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setRequestError(payload.error || 'Failed to request payout');
        return;
      }
      await load();
    } finally {
      setRequestLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Earnings</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-100 bg-green-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-green-800">
              Available to withdraw
              <Wallet className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-semibold text-green-800">{formatNaira(available / 100)}</p>
            {manualPayoutsEnabled ? (
              <Button
                onClick={handleRequestPayout}
                disabled={
                  requestLoading ||
                  hasPendingRequest ||
                  available < 500000 ||
                  !creatorBank
                }
                className="w-full"
              >
                {hasPendingRequest
                  ? 'Payout Request Pending ✓'
                  : `Request Payout — ${formatNaira(available / 100)}`}
              </Button>
            ) : (
              <Button onClick={() => setPayoutOpen(true)} className="w-full">
                Withdraw Now
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-amber-800">
              Pending (held for bookings)
              <Clock className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-800">{formatNaira(pending / 100)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              40% of booking value held until service completion
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-100 bg-orange-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-orange-800">
              Total earned on Foleio
              <TrendingUp className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-orange-800">{formatNaira(totalEarned / 100)}</p>
          </CardContent>
        </Card>
      </div>

      {manualPayoutsEnabled ? (
        <div className="rounded-2xl border border-border bg-white p-6">
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Manual Payouts - Founding Phase
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Payouts are processed every Friday during our founding phase. Request by Thursday midnight to be included in this week&apos;s batch. Automated instant payouts launch in 2 weeks.
              </p>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available to withdraw</p>
              <p className="text-3xl font-bold text-foreground">
                {formatNaira(available / 100)}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>
                Next payout: <strong>Friday</strong>
              </p>
              <p>Min. withdrawal: ₦5,000</p>
            </div>
          </div>

          {!creatorBank ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="mb-1 text-sm font-semibold text-amber-900">
                Add your bank account to request payouts
              </p>
              <p className="mb-3 text-xs text-amber-700">
                Scroll down to set up your payout account
              </p>
              <button
                onClick={() => {
                  document
                    .getElementById('payout-account')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm font-semibold text-primary underline underline-offset-2"
              >
                Set up bank account →
              </button>
            </div>
          ) : (
            <Button
              onClick={handleRequestPayout}
              disabled={requestLoading || !canRequestPayout}
              className="w-full"
            >
              {hasPendingRequest
                ? 'Payout Request Pending ✓'
                : `Request Payout — ${formatNaira(available / 100)}`}
            </Button>
          )}

          {hasPendingRequest ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Your request is queued for Friday&apos;s payout batch. We&apos;ll email you once sent.
            </p>
          ) : null}
          {requestError ? (
            <p className="mt-3 text-center text-sm text-destructive">{requestError}</p>
          ) : null}
        </div>
      ) : null}

      <div id="payout-account" className="mt-6 rounded-2xl border border-border bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Payout Account</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Where we send your earnings
            </p>
          </div>
          {creatorBank ? (
            <button
              onClick={() => setEditingBank(true)}
              className="text-sm text-primary underline underline-offset-2 hover:opacity-80"
            >
              Change
            </button>
          ) : null}
        </div>

        {creatorBank && !editingBank ? (
          <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {creatorBank.bankName}
              </p>
              <p className="text-sm text-muted-foreground">
                {creatorBank.accountNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {creatorBank.accountName}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Verified</span>
            </div>
          </div>
        ) : (
          <BankSetupForm
            onSaved={(bank) => {
              setCreatorBank(bank);
              setEditingBank(false);
            }}
            onCancel={creatorBank ? () => setEditingBank(false) : undefined}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Last 6 months earnings</CardTitle>
          </CardHeader>
          <CardContent className="h-72 rounded-xl bg-[#FFF8EE] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyEarnings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#F97316" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={streamRows} dataKey="amount" nameKey="label" outerRadius={76}>
                    {streamRows.map((item) => (
                      <Cell key={item.type} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {streamRows.map((row) => (
              <div key={row.type} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                  <span>{row.label}</span>
                </div>
                <span className="text-muted-foreground">
                  {formatNaira(row.amount / 100)} ({row.percent}%)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Fan Paid</th>
                    <th className="py-2">Your Earnings</th>
                    <th className="py-2">Foleio Fee</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t">
                      <td className="py-2">{new Date(transaction.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 capitalize">{String(transaction.type || 'payment').replace('_', ' ')}</td>
                      <td className="py-2">{formatNaira(Number(transaction.amount || 0) / 100)}</td>
                      <td className="py-2">{formatNaira(Number(transaction.creatorEarnings || 0) / 100)}</td>
                      <td className="py-2">{formatNaira(Number(transaction.platformFee || 0) / 100)}</td>
                      <td className="py-2">
                        <Badge className={statusClass(String(transaction.status || 'PENDING'))}>
                          {String(transaction.status || 'PENDING')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {data.creator.payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payouts yet — your first withdrawal will appear here
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Bank</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.creator.payouts.map((payout) => (
                    <tr key={payout.id} className="border-t">
                      <td className="py-2">{new Date(payout.createdAt).toLocaleDateString()}</td>
                      <td className="py-2">{formatNaira(Number(payout.amount) / 100)}</td>
                      <td className="py-2">
                        {creatorBank?.bankName || 'Bank account'}
                      </td>
                      <td className="py-2">
                        <Badge className={statusClass(String(payout.status || 'PENDING'))}>
                          {String(payout.status || 'PENDING')}
                        </Badge>
                        {String(payout.status || '').toUpperCase() === 'FAILED' &&
                        payout.failureReason ? (
                          <p className="mt-1 text-xs text-red-600" title={payout.failureReason}>
                            {payout.failureReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 font-mono text-xs">
                        {payout.paystackReference || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!manualPayoutsEnabled ? <PayoutScheduleSettings /> : null}

      {!manualPayoutsEnabled ? (
        <PayoutModal
          open={payoutOpen}
          onOpenChange={setPayoutOpen}
          availableBalance={available}
          platformPlan={data.creator.platformPlan}
          bankAccount={creatorBank}
          onRefresh={load}
        />
      ) : null}
    </div>
  );
}
