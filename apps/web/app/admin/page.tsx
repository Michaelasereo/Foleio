'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CreditCard,
  Crown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoneyFromKobo, formatRelativeTime, transactionTypeBadgeClass } from '@/lib/admin/format';

type StatsPayload = {
  totalCreators: number;
  activeCreators: number;
  totalTransactions: number;
  platformRevenue: number;
  pendingPayouts: number;
  disputedBookings: number;
  waitlistCount: number;
  mrr: number;
  dailySeries: Array<{ date: string; platformRevenue: number; creatorEarnings: number }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    createdAt: string;
    creator?: { displayName?: string | null };
    user?: { email?: string | null };
  }>;
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (!response.ok) return setLoading(false);
      const data = (await response.json()) as StatsPayload;
      setStats(data);
      setLoading(false);
    }
    void load();
  }, []);

  const cards = useMemo(
    () => [
      {
        label: 'Platform Revenue',
        value: formatMoneyFromKobo(stats?.platformRevenue),
        icon: TrendingUp,
        color: 'text-green-600',
      },
      {
        label: 'MRR',
        value: formatMoneyFromKobo(stats?.mrr),
        icon: Crown,
        color: 'text-orange-600',
      },
      {
        label: 'Total Creators',
        value: (stats?.totalCreators || 0).toLocaleString(),
        icon: Users,
        color: 'text-blue-600',
      },
      {
        label: 'Active Creators',
        value: (stats?.activeCreators || 0).toLocaleString(),
        icon: UserCheck,
        color: 'text-blue-600',
      },
      {
        label: 'Total Transactions',
        value: (stats?.totalTransactions || 0).toLocaleString(),
        icon: CreditCard,
        color: 'text-purple-600',
      },
      {
        label: 'Pending Payouts',
        value: formatMoneyFromKobo(stats?.pendingPayouts),
        icon: Clock,
        color: 'text-amber-600',
      },
      {
        label: 'Disputed Bookings',
        value: (stats?.disputedBookings || 0).toLocaleString(),
        icon: AlertTriangle,
        color: 'text-red-600',
      },
      {
        label: 'Waitlist Signups',
        value: (stats?.waitlistCount || 0).toLocaleString(),
        icon: Clock,
        color: 'text-teal-600',
      },
    ],
    [stats]
  );

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading admin overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-border/70 bg-white shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
              </div>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Revenue (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.dailySeries || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="platformRevenue" stroke="#f97316" strokeWidth={2} />
              <Line type="monotone" dataKey="creatorEarnings" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(stats?.recentTransactions || []).map((tx) => (
            <div
              key={tx.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 p-3"
            >
              <div className="flex items-center gap-2">
                <Badge className={`border ${transactionTypeBadgeClass(tx.type)}`}>
                  {tx.type?.replace('_', ' ')}
                </Badge>
                <span className="font-medium">{formatMoneyFromKobo(tx.amount)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {tx.creator?.displayName || 'Unknown creator'} - {tx.user?.email || 'No email'}
              </div>
              <span
                className="text-xs text-muted-foreground"
                title={new Date(tx.createdAt).toLocaleString()}
              >
                {formatRelativeTime(tx.createdAt)}
              </span>
            </div>
          ))}
          {!stats?.recentTransactions?.length ? (
            <p className="text-sm text-muted-foreground">No recent activity yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
