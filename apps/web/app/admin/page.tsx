'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Banknote,
  Calendar,
  Clock,
  CreditCard,
  Crown,
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
import {
  adminMutedClass,
  adminPanelClass,
  formatMoneyFromKobo,
  formatRelativeTime,
  transactionTypeBadgeClass,
} from '@/lib/admin/format';

type StatsPayload = {
  totalCreators: number;
  transactionVolume: number;
  transactionVolumeCount: number;
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

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading overview</span>
      <div className="h-7 w-36 animate-pulse rounded-md bg-[#e7e5e4]" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className={adminPanelClass}>
            <div className="h-3 w-24 animate-pulse rounded bg-[#e7e5e4]" />
            <div className="mt-3 h-7 w-28 animate-pulse rounded bg-[#e7e5e4]" />
            <div className="mt-2 h-3 w-16 animate-pulse rounded bg-[#efece6]" />
          </div>
        ))}
      </div>
      <div className={adminPanelClass}>
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-[#e7e5e4]" />
        <div className="h-80 animate-pulse rounded-lg bg-[#efece6]" />
      </div>
      <div className={adminPanelClass}>
        <div className="mb-4 h-5 w-36 animate-pulse rounded bg-[#e7e5e4]" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg bg-[#efece6]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const fetcher = async (url: string) => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch admin stats');
    return (await response.json()) as StatsPayload;
  };

  const { data: stats, isLoading } = useSWR('/api/admin/stats', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const cards = useMemo(
    () => [
      {
        label: 'Creators',
        value: Number(stats?.totalCreators || 0),
        icon: Users,
        color: 'text-sky-400',
      },
      {
        label: 'Total transaction volume',
        value: Number(stats?.transactionVolume || 0),
        formatter: (value: number) => formatMoneyFromKobo(value),
        hint: `${stats?.transactionVolumeCount || 0} payments`,
        icon: Banknote,
        color: 'text-emerald-700',
      },
      {
        label: 'Pro MRR',
        value: Number(stats?.mrr || 0),
        formatter: (value: number) => formatMoneyFromKobo(value),
        hint: `${stats?.proCreators || 0} on Pro`,
        icon: Crown,
        color: 'text-amber-700',
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
        color: 'text-amber-700',
      },
      {
        label: 'Disputed',
        value: Number(stats?.disputedBookings || 0),
        icon: AlertTriangle,
        color: 'text-red-700',
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
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      <h2 className="foleio-admin-title">Overview</h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const content = (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-xs uppercase tracking-wide ${adminMutedClass}`}>{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#1c1b19]">
                  {card.formatter ? card.formatter(card.value) : card.value.toLocaleString()}
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
                className={`${adminPanelClass} block transition hover:bg-[#f6f5f1]`}
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
              className="rounded-lg bg-[#efece6] px-3 py-1.5 text-xs text-[#6b6964]"
            >
              {chip.key.replace(/_/g, ' ')} · {chip.count}
            </span>
          ))}
        </div>
      ) : null}

      <div className={adminPanelClass}>
        <h3 className="mb-4 text-base font-semibold text-[#1c1b19]">Revenue (last 30 days)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.dailySeries || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
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
                  background: '#f3f2ed',
                  border: '1px solid #e7e5e4',
                  borderRadius: 8,
                }}
                formatter={(value: number, name: string) => [
                  formatMoneyFromKobo(Number(value)),
                  name === 'platformRevenue' ? 'Platform fees' : 'Creator earnings',
                ]}
              />
              <Line
                type="monotone"
                dataKey="platformRevenue"
                stroke="#f59e0b"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="creatorEarnings"
                stroke="#38bdf8"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={adminPanelClass}>
        <h3 className="mb-4 text-base font-semibold text-[#1c1b19]">Recent activity</h3>
        <div className="space-y-2">
          {(stats?.recentTransactions || []).map((tx) => (
            <div
              key={tx.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#efece6] p-3"
            >
              <div className="flex items-center gap-2">
                <Badge className={`border ${transactionTypeBadgeClass(tx.type)}`}>
                  {tx.type?.replace('_', ' ')}
                </Badge>
                <span className="font-medium text-[#1c1b19]">{formatMoneyFromKobo(tx.amount)}</span>
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
