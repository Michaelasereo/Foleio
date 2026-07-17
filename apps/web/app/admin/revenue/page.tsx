'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Area,
  AreaChart,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  adminMutedClass,
  adminPanelClass,
  adminTabActiveClass,
  adminTabIdleClass,
  adminTableCellClass,
  adminTableClass,
  adminTableContainerClass,
  adminTableHeadClass,
  adminTableHeadingRowClass,
  adminTableRowClass,
  adminTableScrollClass,
  formatMoneyFromKobo,
  formatRelativeTime,
  transactionTypeBadgeClass,
} from '@/lib/admin/format';

type Channel = 'all' | 'shop' | 'services' | 'subscriptions';
type Range = '7d' | '30d' | '90d';

type Totals = {
  gmv: number;
  platformFee: number;
  creatorEarnings: number;
  count: number;
};

type RevenuePayload = {
  range: Range;
  channel: Channel;
  summary: Totals;
  byChannel: {
    shop: Totals;
    services: Totals;
    subscriptions: Totals;
  };
  dailySeries: Array<{
    date: string;
    shop: number;
    services: number;
    subscriptions: number;
    platformFee: number;
    gmv: number;
    creatorEarnings: number;
  }>;
  recent: Array<{
    id: string;
    type: string;
    reference: string;
    amount: number;
    platformFee: number;
    creatorEarnings: number;
    createdAt: string;
    creator?: { displayName?: string | null; username?: string | null } | null;
    user?: { email?: string | null; fullName?: string | null } | null;
  }>;
};

const CHANNEL_TABS: Array<{ id: Channel; label: string }> = [
  { id: 'all', label: 'Summary' },
  { id: 'shop', label: 'Shop' },
  { id: 'services', label: 'Services' },
  { id: 'subscriptions', label: 'Subscriptions' },
];

const RANGE_OPTIONS: Array<{ id: Range; label: string }> = [
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
];

const MIX_COLORS = {
  shop: '#2dd4bf',
  services: '#fb923c',
  subscriptions: '#38bdf8',
};

function MetricCards({ totals }: { totals: Totals }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {[
        { label: 'GMV', value: formatMoneyFromKobo(totals.gmv) },
        { label: 'Foleio fees', value: formatMoneyFromKobo(totals.platformFee) },
        { label: 'Creator earnings', value: formatMoneyFromKobo(totals.creatorEarnings) },
        { label: 'Transactions', value: String(totals.count) },
      ].map((card) => (
        <div key={card.label} className={adminPanelClass}>
          <p className={`text-xs uppercase tracking-wide ${adminMutedClass}`}>{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-[#f4f4f5]">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function RecentTable({ rows }: { rows: RevenuePayload['recent'] }) {
  if (rows.length === 0) {
    return (
      <div className={`${adminPanelClass} py-10 text-center ${adminMutedClass}`}>
        No transactions in this range.
      </div>
    );
  }

  return (
    <div className={adminTableContainerClass}>
      <div className={adminTableScrollClass}>
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}>
            <tr className={adminTableHeadingRowClass}>
              <th className={adminTableCellClass}>Type</th>
              <th className={adminTableCellClass}>Creator</th>
              <th className={adminTableCellClass}>Customer</th>
              <th className={adminTableCellClass}>GMV</th>
              <th className={adminTableCellClass}>Fee</th>
              <th className={adminTableCellClass}>Creator cut</th>
              <th className={adminTableCellClass}>When</th>
              <th className={adminTableCellClass}>Reference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr key={tx.id} className={adminTableRowClass}>
                <td className={adminTableCellClass}>
                  <Badge className={`border ${transactionTypeBadgeClass(tx.type)}`}>
                    {tx.type.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className={adminTableCellClass}>
                  <p className="font-medium">{tx.creator?.displayName || '—'}</p>
                  <p className={`text-xs ${adminMutedClass}`}>
                    {tx.creator?.username ? `@${tx.creator.username}` : '—'}
                  </p>
                </td>
                <td className={adminTableCellClass}>
                  <p className="text-sm">{tx.user?.fullName || '—'}</p>
                  <p className={`text-xs ${adminMutedClass}`}>{tx.user?.email || '—'}</p>
                </td>
                <td className={adminTableCellClass}>{formatMoneyFromKobo(tx.amount)}</td>
                <td className={adminTableCellClass}>{formatMoneyFromKobo(tx.platformFee)}</td>
                <td className={adminTableCellClass}>
                  {formatMoneyFromKobo(tx.creatorEarnings)}
                </td>
                <td className={adminTableCellClass}>
                  <span title={new Date(tx.createdAt).toLocaleString()}>
                    {formatRelativeTime(tx.createdAt)}
                  </span>
                </td>
                <td className={`${adminTableCellClass} font-mono text-xs ${adminMutedClass}`}>
                  {tx.reference}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminRevenuePage() {
  const [channel, setChannel] = useState<Channel>('all');
  const [range, setRange] = useState<Range>('30d');

  const fetcher = async (url: string) => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch revenue');
    return (await response.json()) as RevenuePayload;
  };

  const { data, isLoading, error } = useSWR(
    `/api/admin/revenue?range=${range}&channel=${channel}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const scopedTotals = useMemo(() => {
    if (!data) return emptyLike();
    if (channel === 'all') return data.summary;
    return data.byChannel[channel];
  }, [data, channel]);

  const mixData = useMemo(() => {
    if (!data) return [];
    return (
      [
        { name: 'Shop', key: 'shop' as const, value: data.byChannel.shop.platformFee },
        { name: 'Services', key: 'services' as const, value: data.byChannel.services.platformFee },
        {
          name: 'Subscriptions',
          key: 'subscriptions' as const,
          value: data.byChannel.subscriptions.platformFee,
        },
      ] as const
    ).filter((row) => row.value > 0);
  }, [data]);

  const chartTooltip = {
    background: '#212121',
    border: '1px solid #201e1c',
    borderRadius: 8,
  };

  if (isLoading && !data) {
    return <p className={`text-sm ${adminMutedClass}`}>Loading revenue…</p>;
  }

  if (error || !data) {
    return (
      <p className={`text-sm text-red-300`}>Could not load revenue data. Refresh and try again.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="foleio-admin-title">Revenue</h1>
          <p className={`foleio-admin-meta ${adminMutedClass}`}>
            Shop, services, and subscription income with trends
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.id}
              size="sm"
              variant="ghost"
              className={range === option.id ? adminTabActiveClass : adminTabIdleClass}
              onClick={() => setRange(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHANNEL_TABS.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant="ghost"
            className={channel === tab.id ? adminTabActiveClass : adminTabIdleClass}
            onClick={() => setChannel(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <MetricCards totals={scopedTotals} />

      {channel === 'all' ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {(
              [
                { key: 'shop', label: 'Shop' },
                { key: 'services', label: 'Services' },
                { key: 'subscriptions', label: 'Subscriptions' },
              ] as const
            ).map((item) => {
              const totals = data.byChannel[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`${adminPanelClass} text-left transition hover:bg-white/[0.03]`}
                  onClick={() => setChannel(item.key)}
                >
                  <p className={`text-xs uppercase tracking-wide ${adminMutedClass}`}>
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[#f4f4f5]">
                    {formatMoneyFromKobo(totals.platformFee)}
                  </p>
                  <p className={`mt-1 text-xs ${adminMutedClass}`}>
                    GMV {formatMoneyFromKobo(totals.gmv)} · {totals.count} txs
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className={`${adminPanelClass} xl:col-span-2`}>
              <h3 className="mb-4 text-base font-semibold text-[#f4f4f5]">
                GMV by channel
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#201e1c" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: '#828282' }}
                      tickFormatter={(value) => String(value).slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#828282' }}
                      tickFormatter={(value) => formatMoneyFromKobo(Number(value))}
                    />
                    <Tooltip
                      contentStyle={chartTooltip}
                      formatter={(value: number, name: string) => [
                        formatMoneyFromKobo(Number(value)),
                        name.charAt(0).toUpperCase() + name.slice(1),
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="shop"
                      stackId="1"
                      stroke={MIX_COLORS.shop}
                      fill={MIX_COLORS.shop}
                      fillOpacity={0.35}
                    />
                    <Area
                      type="monotone"
                      dataKey="services"
                      stackId="1"
                      stroke={MIX_COLORS.services}
                      fill={MIX_COLORS.services}
                      fillOpacity={0.35}
                    />
                    <Area
                      type="monotone"
                      dataKey="subscriptions"
                      stackId="1"
                      stroke={MIX_COLORS.subscriptions}
                      fill={MIX_COLORS.subscriptions}
                      fillOpacity={0.35}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={adminPanelClass}>
              <h3 className="mb-4 text-base font-semibold text-[#f4f4f5]">
                Fee mix
              </h3>
              {mixData.length === 0 ? (
                <p className={`py-16 text-center text-sm ${adminMutedClass}`}>
                  No fees in this range.
                </p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mixData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {mixData.map((entry) => (
                          <Cell key={entry.key} fill={MIX_COLORS[entry.key]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltip}
                        formatter={(value: number, name: string) => [
                          formatMoneyFromKobo(Number(value)),
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className={adminPanelClass}>
            <h3 className="mb-4 text-base font-semibold text-[#f4f4f5]">
              Platform fee trend
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#201e1c" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#828282' }}
                    tickFormatter={(value) => String(value).slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#828282' }}
                    tickFormatter={(value) => formatMoneyFromKobo(Number(value))}
                  />
                  <Tooltip
                    contentStyle={chartTooltip}
                    formatter={(value: number) => [
                      formatMoneyFromKobo(Number(value)),
                      'Platform fees',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="platformFee"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className={adminPanelClass}>
          <h3 className="mb-4 text-base font-semibold text-[#f4f4f5]">
            {CHANNEL_TABS.find((t) => t.id === channel)?.label} trend
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#201e1c" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#828282' }}
                  tickFormatter={(value) => String(value).slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#828282' }}
                  tickFormatter={(value) => formatMoneyFromKobo(Number(value))}
                />
                <Tooltip
                  contentStyle={chartTooltip}
                  formatter={(value: number, name: string) => [
                    formatMoneyFromKobo(Number(value)),
                    name === 'gmv' ? 'GMV' : name === 'platformFee' ? 'Fees' : 'Creator earnings',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="gmv"
                  stroke={MIX_COLORS[channel]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="platformFee"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="creatorEarnings"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-base font-semibold text-[#f4f4f5]">Recent transactions</h3>
        <RecentTable rows={data.recent} />
      </div>
    </div>
  );
}

function emptyLike(): Totals {
  return { gmv: 0, platformFee: 0, creatorEarnings: 0, count: 0 };
}
