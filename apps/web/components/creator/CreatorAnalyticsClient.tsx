'use client';

import { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNaira } from '@foleio/utils';

type AnalyticsStats = {
  totalBookings: number;
  bookingsThisMonth: number;
  totalEarnings: number;
  upcomingBookings: number;
  averageBookingValue: number;
  percentageChanges: {
    bookings: string | null;
    earnings: string | null;
  };
  monthlySeries: Array<{
    month: string;
    income: number;
    bookings: number;
  }>;
  topServices: Array<{
    id: string;
    name: string;
    bookingCount: number;
    revenue: number;
  }>;
  recentBookings: Array<{
    id: string;
    customerName: string;
    bookingDate: string;
    totalAmount: number;
    priceListItem?: { name: string } | null;
  }>;
};

/** Preview-only dummy data so the dark UI can be designed without waiting on live stats. */
const DUMMY_ANALYTICS: AnalyticsStats = {
  totalBookings: 128,
  bookingsThisMonth: 18,
  totalEarnings: 51240000, // ₦512,400
  upcomingBookings: 7,
  averageBookingValue: 4500000, // ₦45,000
  percentageChanges: {
    bookings: '+22%',
    earnings: '+14%',
  },
  monthlySeries: [
    { month: 'Feb', income: 6200000, bookings: 14 },
    { month: 'Mar', income: 7800000, bookings: 17 },
    { month: 'Apr', income: 5400000, bookings: 12 },
    { month: 'May', income: 9100000, bookings: 21 },
    { month: 'Jun', income: 8600000, bookings: 19 },
    { month: 'Jul', income: 11200000, bookings: 18 },
  ],
  topServices: [
    {
      id: 'svc-1',
      name: '1:1 Strategy Session',
      bookingCount: 42,
      revenue: 18900000,
    },
    {
      id: 'svc-2',
      name: 'Brand Photoshoot',
      bookingCount: 28,
      revenue: 16800000,
    },
    {
      id: 'svc-3',
      name: 'Content Review Call',
      bookingCount: 35,
      revenue: 8750000,
    },
    {
      id: 'svc-4',
      name: 'Portfolio Critique',
      bookingCount: 23,
      revenue: 6900000,
    },
  ],
  recentBookings: [
    {
      id: 'bk-1',
      customerName: 'Adaobi Okonkwo',
      bookingDate: '2026-07-10T14:00:00.000Z',
      totalAmount: 5000000,
      priceListItem: { name: '1:1 Strategy Session' },
    },
    {
      id: 'bk-2',
      customerName: 'Tunde Balogun',
      bookingDate: '2026-07-08T11:00:00.000Z',
      totalAmount: 8000000,
      priceListItem: { name: 'Brand Photoshoot' },
    },
    {
      id: 'bk-3',
      customerName: 'Chioma Eze',
      bookingDate: '2026-07-05T16:30:00.000Z',
      totalAmount: 2500000,
      priceListItem: { name: 'Content Review Call' },
    },
    {
      id: 'bk-4',
      customerName: 'Ibrahim Musa',
      bookingDate: '2026-07-02T09:00:00.000Z',
      totalAmount: 3000000,
      priceListItem: { name: 'Portfolio Critique' },
    },
    {
      id: 'bk-5',
      customerName: 'Funke Adeyemi',
      bookingDate: '2026-06-28T13:00:00.000Z',
      totalAmount: 5000000,
      priceListItem: { name: '1:1 Strategy Session' },
    },
  ],
};

const CHART_ACCENT = '#3B5FDB';

function changeTone(change: string | null) {
  if (!change) return '';
  if (change.startsWith('+')) return 'is-up';
  if (change.startsWith('-')) return 'is-down';
  return '';
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const income = Number(payload[0]?.value || 0);
  return (
    <div
      style={{
        background: '#2b2b2b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '8px 10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}
    >
      <p style={{ margin: 0, color: '#adadad', fontSize: 12 }}>{label}</p>
      <p style={{ margin: '4px 0 0', color: '#f4f4f5', fontSize: 14, fontWeight: 500 }}>
        {formatNaira(income / 100)}
      </p>
    </div>
  );
}

export function CreatorAnalyticsClient() {
  const [stats] = useState<AnalyticsStats>(DUMMY_ANALYTICS);
  // preview-build: v3-income-chart

  const maxServiceBookings = Math.max(
    ...stats.topServices.map((s) => s.bookingCount),
    1
  );

  const summary = [
    {
      title: 'Total bookings',
      value: String(stats.totalBookings),
      change: null as string | null,
      hint: 'All time',
      icon: Users,
    },
    {
      title: 'This month',
      value: String(stats.bookingsThisMonth),
      change: stats.percentageChanges.bookings,
      hint: 'vs last month',
      icon: CalendarClock,
    },
    {
      title: 'Income',
      value: formatNaira(stats.totalEarnings / 100),
      change: stats.percentageChanges.earnings,
      hint: 'vs last month',
      icon: Wallet,
    },
    {
      title: 'Upcoming',
      value: String(stats.upcomingBookings),
      change: null,
      hint: 'Confirmed ahead',
      icon: TrendingUp,
    },
    {
      title: 'Avg booking value',
      value: formatNaira(stats.averageBookingValue / 100),
      change: null,
      hint: 'Per paid booking',
      icon: CheckCircle2,
    },
  ];

  return (
    <div>
      <div className="foleio-dash-header">
        <div>
          <h1 className="foleio-auth-title">Analytics</h1>
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
            Bookings, income, and service performance · Preview data
          </p>
        </div>
      </div>

      <div className="foleio-dash-panel" style={{ marginBottom: 14 }}>
        <h2 className="foleio-dash-panel-title">Income trend</h2>
        <p className="foleio-dash-panel-meta">Last 6 months</p>
        <div style={{ width: '100%', height: 220, marginTop: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={stats.monthlySeries}
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="analyticsIncomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#828282', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={56}
                tick={{ fill: '#828282', fontSize: 12 }}
                tickFormatter={(value) =>
                  `₦${Math.round(Number(value) / 100000)}k`
                }
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)' }} />
              <Area
                type="monotone"
                dataKey="income"
                stroke={CHART_ACCENT}
                strokeWidth={2}
                fill="url(#analyticsIncomeFill)"
                activeDot={{ r: 4, strokeWidth: 0, fill: CHART_ACCENT }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="foleio-dash-stats">
        {summary.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="foleio-dash-stat">
              <div className="foleio-dash-stat-top">
                <span className="foleio-dash-stat-label">{stat.title}</span>
                <Icon className="foleio-dash-stat-icon h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="foleio-dash-stat-value">{stat.value}</div>
              {stat.change ? (
                <p className={`foleio-dash-stat-change ${changeTone(stat.change)}`}>
                  {stat.change} {stat.hint}
                </p>
              ) : (
                <p className="foleio-dash-stat-change">{stat.hint}</p>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        <div className="foleio-dash-panel">
          <h2 className="foleio-dash-panel-title">Top services</h2>
          <p className="foleio-dash-panel-meta">By booking volume</p>
          {stats.topServices.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              {stats.topServices.map((service) => {
                const percent = Math.round(
                  (service.bookingCount / maxServiceBookings) * 100
                );
                return (
                  <div key={service.id}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            color: '#f4f4f5',
                            fontSize: 14,
                            fontWeight: 500,
                            margin: 0,
                          }}
                        >
                          {service.name}
                        </p>
                        <p
                          style={{
                            color: '#828282',
                            fontSize: 12,
                            margin: '2px 0 0',
                          }}
                        >
                          {service.bookingCount} bookings
                        </p>
                      </div>
                      <span
                        style={{
                          color: '#adadad',
                          fontSize: 13,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatNaira(service.revenue / 100)}
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
                          width: `${percent}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: 'hsl(var(--accent))',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="foleio-dash-empty">No booking analytics yet.</p>
          )}
        </div>

        <div className="foleio-dash-panel">
          <h2 className="foleio-dash-panel-title">Recent paid bookings</h2>
          <p className="foleio-dash-panel-meta">Latest confirmed bookings</p>
          {stats.recentBookings.length ? (
            <div>
              {stats.recentBookings.map((booking) => (
                <div key={booking.id} className="foleio-dash-sub-row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="foleio-dash-sub-name">{booking.customerName}</p>
                    <p className="foleio-dash-sub-date">
                      {booking.priceListItem?.name || 'Service'} ·{' '}
                      {new Date(booking.bookingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{ color: '#f4f4f5', fontSize: 14, fontWeight: 500 }}>
                    {formatNaira(booking.totalAmount / 100)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="foleio-dash-empty">No paid bookings yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
