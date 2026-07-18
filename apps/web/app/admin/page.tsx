'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  Clock,
  CreditCard,
  Crown,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import useSWR from 'swr';
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
import { AnimatedCount } from '@/components/ui/AnimatedCount';
import {
  adminMutedClass,
  adminPanelClass,
  formatMoneyFromKobo,
  formatRelativeTime,
  transactionTypeBadgeClass,
} from '@/lib/admin/format';
import { createClient } from '@/lib/supabase/client';

type StatsPayload = {
  totalCreators: number;
  paymentsReadyCreators: number;
  paymentsReadyPct: number;
  proCreators: number;
  totalTransactions: number;
  platformRevenue: number;
  pendingPayouts: number;
  disputedBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalBookings: number;
  waitlistCount: number;
  mrr: number;
  bookingsByStatus?: Record<string, number>;
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
  const fetcher = async (url: string) => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch admin stats');
    return (await response.json()) as StatsPayload;
  };

  const { data: stats, isLoading, mutate } = useSWR('/api/admin/stats', fetcher, {
    refreshInterval: 30000,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-live-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        void mutate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payouts' }, () => {
        void mutate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        void mutate();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mutate]);

  const cards = useMemo(
    () => [
      {
        label: 'Creators',
        value: Number(stats?.totalCreators || 0),
        icon: Users,
        color: 'text-sky-400',
      },
      {
        label: 'Payments ready',
        value: Number(stats?.paymentsReadyPct || 0),
        formatter: (value: number) => `${value}%`,
        hint: `${stats?.paymentsReadyCreators || 0} ready`,
        icon: ShieldCheck,
        color: 'text-emerald-400',
      },
      {
        label: 'Pro MRR',
        value: Number(stats?.mrr || 0),
        formatter: (value: number) => formatMoneyFromKobo(value),
        hint: `${stats?.proCreators || 0} on Pro`,
        icon: Crown,
        color: 'text-amber-400',
      },
      {
        label: 'Platform fees',
        value: Number(stats?.platformRevenue || 0),
        formatter: (value: number) => formatMoneyFromKobo(value),
        hint: 'Same as Revenue · all time',
        icon: TrendingUp,
        color: 'text-emerald-400',
        href: '/admin/revenue',
      },
      {
        label: 'Bookings',
        value: Number(stats?.totalBookings || 0),
        hint: `${stats?.completedBookings || 0} completed`,
        icon: Calendar,
        color: 'text-orange-400',
      },
      {
        label: 'Pending bookings',
        value: Number(stats?.pendingBookings || 0),
        icon: Clock,
        color: 'text-amber-400',
      },
      {
        label: 'Disputed',
        value: Number(stats?.disputedBookings || 0),
        icon: AlertTriangle,
        color: 'text-red-400',
      },
      {
        label: 'Invites pending',
        value: Number(stats?.waitlistCount || 0),
        icon: CreditCard,
        color: 'text-teal-400',
        href: '/admin/access',
      },
    ],
    [stats]
  );

  const statusChips = useMemo(() => {
    const map = stats?.bookingsByStatus || {};
    const keys = [
      'pending',
      'deposit_paid',
      'balance_overdue',
      'paid',
      'first_payout_done',
      'service_day',
      'completed',
      'disputed',
      'refunded',
    ];
    return keys
      .map((key) => ({ key, count: Number(map[key] || 0) }))
      .filter((row) => row.count > 0);
  }, [stats]);

  if (isLoading) {
    return <div className={`p-2 text-sm ${adminMutedClass}`}>Loading admin overview…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="foleio-admin-title">Overview</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const content = (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-xs uppercase tracking-wide ${adminMutedClass}`}>{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#f4f4f5]">
                  <AnimatedCount value={card.value} format={card.formatter} />
                </p>
                {card.hint ? <p className={`mt-1 text-xs ${adminMutedClass}`}>{card.hint}</p> : null}
              </div>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
          );

          if ('href' in card && card.href) {
            return (
              <Link
                key={card.label}
                href={card.href}
                className={`${adminPanelClass} block transition hover:bg-white/[0.03]`}
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={card.label} className={adminPanelClass}>
              {content}
            </div>
          );
        })}
      </div>

      {statusChips.length ? (
        <div className={`${adminPanelClass} flex flex-wrap gap-2`}>
          <p className={`w-full text-xs uppercase tracking-wide ${adminMutedClass}`}>
            Bookings by status
          </p>
          {statusChips.map((chip) => (
            <span
              key={chip.key}
              className="rounded-lg bg-[#252321] px-3 py-1.5 text-xs text-[#adadad]"
            >
              {chip.key.replace(/_/g, ' ')} · {chip.count}
            </span>
          ))}
        </div>
      ) : null}

      <div className={adminPanelClass}>
        <h3 className="mb-4 text-base font-semibold text-[#f4f4f5]">Revenue (last 30 days)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.dailySeries || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#201e1c" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#828282' }}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#828282' }}
                tickFormatter={(value) => formatMoneyFromKobo(Number(value))}
              />
              <Tooltip
                contentStyle={{
                  background: '#212121',
                  border: '1px solid #201e1c',
                  borderRadius: 8,
                }}
                formatter={(value: number, name: string) => [
                  formatMoneyFromKobo(Number(value)),
                  name === 'platformRevenue' ? 'Platform fees' : 'Creator earnings',
                ]}
              />
              <Line type="monotone" dataKey="platformRevenue" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="creatorEarnings" stroke="#38bdf8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={adminPanelClass}>
        <h3 className="mb-4 text-base font-semibold text-[#f4f4f5]">Recent activity</h3>
        <div className="space-y-2">
          {(stats?.recentTransactions || []).map((tx) => (
            <div
              key={tx.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#252321] p-3"
            >
              <div className="flex items-center gap-2">
                <Badge className={`border ${transactionTypeBadgeClass(tx.type)}`}>
                  {tx.type?.replace('_', ' ')}
                </Badge>
                <span className="font-medium text-[#f4f4f5]">{formatMoneyFromKobo(tx.amount)}</span>
              </div>
              <div className={`text-sm ${adminMutedClass}`}>
                {tx.creator?.displayName || 'Unknown creator'} — {tx.user?.email || 'No email'}
              </div>
              <span className={`text-xs ${adminMutedClass}`} title={new Date(tx.createdAt).toLocaleString()}>
                {formatRelativeTime(tx.createdAt)}
              </span>
            </div>
          ))}
          {!stats?.recentTransactions?.length ? (
            <p className={`text-sm ${adminMutedClass}`}>No recent activity yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
