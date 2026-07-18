'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Package,
  ShoppingBag,
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
import { AnalyticsLoadingSkeleton } from '@/components/creator/AnalyticsLoadingSkeleton';

type AnalyticsTab = 'bookings' | 'shop';

type BookingAnalytics = {
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

type ShopAnalytics = {
  totalOrders: number;
  ordersThisMonth: number;
  totalRevenue: number;
  productsSold: number;
  averageOrderValue: number;
  percentageChanges: {
    orders: string | null;
    revenue: string | null;
  };
  monthlySeries: Array<{
    month: string;
    income: number;
    orders: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    unitsSold: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    customerName: string;
    createdAt: string;
    totalAmount: number;
    itemLabel: string;
  }>;
};

type AnalyticsPayload = {
  bookings: BookingAnalytics;
  shop: ShopAnalytics;
};

const EMPTY_BOOKINGS: BookingAnalytics = {
  totalBookings: 0,
  bookingsThisMonth: 0,
  totalEarnings: 0,
  upcomingBookings: 0,
  averageBookingValue: 0,
  percentageChanges: { bookings: null, earnings: null },
  monthlySeries: [],
  topServices: [],
  recentBookings: [],
};

const EMPTY_SHOP: ShopAnalytics = {
  totalOrders: 0,
  ordersThisMonth: 0,
  totalRevenue: 0,
  productsSold: 0,
  averageOrderValue: 0,
  percentageChanges: { orders: null, revenue: null },
  monthlySeries: [],
  topProducts: [],
  recentOrders: [],
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

function IncomeTrendChart({
  title,
  data,
  gradientId,
}: {
  title: string;
  data: Array<{ month: string; income: number }>;
  gradientId: string;
}) {
  return (
    <div className="foleio-dash-panel" style={{ marginBottom: 14 }}>
      <h2 className="foleio-dash-panel-title">{title}</h2>
      <p className="foleio-dash-panel-meta">Last 6 months</p>
      {data.length === 0 ? (
        <p className="foleio-dash-empty">No trend data yet.</p>
      ) : (
        <div style={{ width: '100%', height: 220, marginTop: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
                tickFormatter={(value) => `₦${Math.round(Number(value) / 100000)}k`}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: 'rgba(255,255,255,0.12)' }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke={CHART_ACCENT}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                activeDot={{ r: 4, strokeWidth: 0, fill: CHART_ACCENT }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function RankingBars({
  title,
  meta,
  empty,
  rows,
}: {
  title: string;
  meta: string;
  empty: string;
  rows: Array<{
    id: string;
    name: string;
    countLabel: string;
    revenue: number;
    percent: number;
  }>;
}) {
  return (
    <div className="foleio-dash-panel">
      <h2 className="foleio-dash-panel-title">{title}</h2>
      <p className="foleio-dash-panel-meta">{meta}</p>
      {rows.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          {rows.map((row) => (
            <div key={row.id}>
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
                    {row.name}
                  </p>
                  <p style={{ color: '#828282', fontSize: 12, margin: '2px 0 0' }}>
                    {row.countLabel}
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
                  {formatNaira(row.revenue / 100)}
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
      ) : (
        <p className="foleio-dash-empty">{empty}</p>
      )}
    </div>
  );
}

export function CreatorAnalyticsClient({
  hideHeader = false,
}: {
  hideHeader?: boolean;
}) {
  const [tab, setTab] = useState<AnalyticsTab>('bookings');
  const [bookings, setBookings] = useState<BookingAnalytics>(EMPTY_BOOKINGS);
  const [shop, setShop] = useState<ShopAnalytics>(EMPTY_SHOP);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const loadAnalytics = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/creator/analytics', {
      cache: 'no-store',
      signal,
    });
    const payload = (await response.json()) as AnalyticsPayload & { error?: string };
    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to load analytics');
    }
    setBookings({ ...EMPTY_BOOKINGS, ...(payload.bookings || {}) });
    setShop({ ...EMPTY_SHOP, ...(payload.shop || {}) });
    setError(null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loadAnalytics(controller.signal)
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
        setBookings(EMPTY_BOOKINGS);
        setShop(EMPTY_SHOP);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [loadAnalytics, retryKey]);

  if (loading) {
    return <AnalyticsLoadingSkeleton />;
  }

  if (error) {
    return (
      <div>
        {hideHeader ? null : <h1 className="foleio-auth-title">Analytics</h1>}
        <p className="foleio-dash-panel-meta" style={{ marginTop: hideHeader ? 0 : 8 }}>
          {error}
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

  const maxServiceBookings = Math.max(
    ...bookings.topServices.map((s) => s.bookingCount),
    1
  );
  const maxProductUnits = Math.max(...shop.topProducts.map((p) => p.unitsSold), 1);

  const bookingSummary = [
    {
      title: 'Total bookings',
      value: String(bookings.totalBookings),
      change: null as string | null,
      hint: 'All time',
      icon: Users,
    },
    {
      title: 'This month',
      value: String(bookings.bookingsThisMonth),
      change: bookings.percentageChanges.bookings,
      hint: 'vs last month',
      icon: CalendarClock,
    },
    {
      title: 'Income',
      value: formatNaira(bookings.totalEarnings / 100),
      change: bookings.percentageChanges.earnings,
      hint: 'vs last month',
      icon: Wallet,
    },
    {
      title: 'Upcoming',
      value: String(bookings.upcomingBookings),
      change: null,
      hint: 'Confirmed ahead',
      icon: TrendingUp,
    },
    {
      title: 'Avg booking value',
      value: formatNaira(bookings.averageBookingValue / 100),
      change: null,
      hint: 'Per paid booking',
      icon: CheckCircle2,
    },
  ];

  const shopSummary = [
    {
      title: 'Total orders',
      value: String(shop.totalOrders),
      change: null as string | null,
      hint: 'All time',
      icon: ShoppingBag,
    },
    {
      title: 'This month',
      value: String(shop.ordersThisMonth),
      change: shop.percentageChanges.orders,
      hint: 'vs last month',
      icon: CalendarClock,
    },
    {
      title: 'Shop revenue',
      value: formatNaira(shop.totalRevenue / 100),
      change: shop.percentageChanges.revenue,
      hint: 'vs last month',
      icon: Wallet,
    },
    {
      title: 'Products sold',
      value: String(shop.productsSold),
      change: null,
      hint: 'Units fulfilled',
      icon: Package,
    },
    {
      title: 'Avg order value',
      value: formatNaira(shop.averageOrderValue / 100),
      change: null,
      hint: 'Per paid order',
      icon: CheckCircle2,
    },
  ];

  const summary = tab === 'bookings' ? bookingSummary : shopSummary;

  return (
    <div>
      {hideHeader ? null : (
        <div className="foleio-dash-header">
          <div>
            <h1 className="foleio-auth-title">Analytics</h1>
            <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
              {tab === 'bookings'
                ? 'Bookings, income, and service performance'
                : 'Orders, product sales, and shop revenue'}
            </p>
          </div>
        </div>
      )}

      <div className="foleio-dash-tabs" role="tablist" aria-label="Analytics sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'bookings'}
          className={`foleio-dash-tab${tab === 'bookings' ? ' is-active' : ''}`}
          onClick={() => setTab('bookings')}
        >
          Bookings
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'shop'}
          className={`foleio-dash-tab${tab === 'shop' ? ' is-active' : ''}`}
          onClick={() => setTab('shop')}
        >
          Shop
        </button>
      </div>

      <IncomeTrendChart
        title={tab === 'bookings' ? 'Income trend' : 'Shop revenue trend'}
        data={tab === 'bookings' ? bookings.monthlySeries : shop.monthlySeries}
        gradientId={tab === 'bookings' ? 'analyticsIncomeFill' : 'analyticsShopFill'}
      />

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
        {tab === 'bookings' ? (
          <>
            <RankingBars
              title="Top services"
              meta="By booking volume"
              empty="No booking analytics yet."
              rows={bookings.topServices.map((service) => ({
                id: service.id,
                name: service.name,
                countLabel: `${service.bookingCount} bookings`,
                revenue: service.revenue,
                percent: Math.round((service.bookingCount / maxServiceBookings) * 100),
              }))}
            />

            <div className="foleio-dash-panel">
              <h2 className="foleio-dash-panel-title">Recent paid bookings</h2>
              <p className="foleio-dash-panel-meta">Latest confirmed bookings</p>
              {bookings.recentBookings.length ? (
                <div>
                  {bookings.recentBookings.map((booking) => (
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
          </>
        ) : (
          <>
            <RankingBars
              title="Top products"
              meta="By units sold"
              empty="No shop analytics yet."
              rows={shop.topProducts.map((product) => ({
                id: product.id,
                name: product.name,
                countLabel: `${product.unitsSold} sold`,
                revenue: product.revenue,
                percent: Math.round((product.unitsSold / maxProductUnits) * 100),
              }))}
            />

            <div className="foleio-dash-panel">
              <h2 className="foleio-dash-panel-title">Recent orders</h2>
              <p className="foleio-dash-panel-meta">Latest paid shop orders</p>
              {shop.recentOrders.length ? (
                <div>
                  {shop.recentOrders.map((order) => (
                    <div key={order.id} className="foleio-dash-sub-row">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p className="foleio-dash-sub-name">{order.customerName}</p>
                        <p className="foleio-dash-sub-date">
                          {order.itemLabel} ·{' '}
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span style={{ color: '#f4f4f5', fontSize: 14, fontWeight: 500 }}>
                        {formatNaira(order.totalAmount / 100)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="foleio-dash-empty">No paid orders yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
