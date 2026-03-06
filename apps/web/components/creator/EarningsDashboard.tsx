'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, TrendingUp, Wallet } from 'lucide-react';
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

type EarningsPayload = {
  creator: {
    availableBalance: number;
    pendingBalance: string | number;
    totalEarned: number;
    platformPlan: string | null;
    bvnVerified: boolean;
    bankAccount: any | null;
    payouts: Array<any>;
  };
  monthlyEarnings: Array<{ month: string; amount: number }>;
  byStream: Array<{ type: string; amount: number }>;
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
  const [payoutOpen, setPayoutOpen] = useState(false);

  async function load() {
    const response = await fetch('/api/creator/earnings', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = (await response.json()) as EarningsPayload;
    setData(payload);
  }

  useEffect(() => {
    void load();
  }, []);

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

  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading earnings...</p>;
  }

  const available = Number(data.creator.availableBalance || 0);
  const pending = Number(data.creator.pendingBalance || 0);
  const totalEarned = Number(data.creator.totalEarned || 0);

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
            <Button onClick={() => setPayoutOpen(true)} className="w-full">
              Withdraw Now
            </Button>
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
                        {data.creator.bankAccount?.bankName || 'Bank account'}
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

      <PayoutScheduleSettings />

      <PayoutModal
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        availableBalance={available}
        platformPlan={data.creator.platformPlan}
        bankAccount={data.creator.bankAccount}
        bvnVerified={data.creator.bvnVerified}
        onRefresh={load}
      />
    </div>
  );
}
