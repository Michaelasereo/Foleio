'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, Calendar } from 'lucide-react';
import { formatNaira } from '@foleio/utils';
import styles from '@/components/demo/demo-dashboard.module.css';
import { EmptyState } from '@/components/demo/EmptyState';
import { EarningsChrome, type EarningsView } from '@/components/creator/earnings-live';
import { AnalyticsLoadingSkeleton } from '@/components/creator/AnalyticsLoadingSkeleton';

type AnalyticsTab = 'bookings' | 'shop';

type BookingAnalytics = {
  totalBookings: number;
  bookingsThisMonth: number;
  totalEarnings: number;
  upcomingBookings: number;
  averageBookingValue: number;
  bookingsLastMonth: number;
  nextBookingDate: string | null;
  weekdayCounts: number[];
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
  ordersLastMonth: number;
  weekdayCounts: number[];
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
  bookingsLastMonth: 0,
  nextBookingDate: null,
  weekdayCounts: [0, 0, 0, 0, 0, 0, 0],
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
  ordersLastMonth: 0,
  weekdayCounts: [0, 0, 0, 0, 0, 0, 0],
  percentageChanges: { orders: null, revenue: null },
  monthlySeries: [],
  topProducts: [],
  recentOrders: [],
};

export function CreatorAnalyticsClient({
  hideHeader = false,
  onView,
}: {
  hideHeader?: boolean;
  onView?: (view: EarningsView) => void;
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

  const series = tab === 'bookings' ? bookings.monthlySeries : shop.monthlySeries;
  const income = series.reduce((sum, row) => sum + Number(row.income || 0), 0);
  const maxIncome = Math.max(...series.map((row) => Number(row.income || 0)), 0);
  const best = series.reduce<(typeof series)[number] | null>((top, row) => (
    !top || row.income > top.income ? row : top
  ), null);
  const current = series[series.length - 1];
  const first = series[0];
  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const share = best && best.income > 0 && current ? Math.round((current.income / best.income) * 100) : 0;
  const rangeLabel = first && current ? `${first.month} to ${current.month}` : 'the last six months';
  const summary = best && current && best.month !== current.month && best.income > 0
    ? `${best.month} was your best month. ${current.month} has ${daysLeft} day${daysLeft === 1 ? '' : 's'} left and is already at ${share}% of it.`
    : current && current.income > 0
      ? `${current.month} is your best month so far.`
      : 'Recorded payments will show up here.';
  const counts = (tab === 'bookings' ? bookings.weekdayCounts : shop.weekdayCounts) || [0, 0, 0, 0, 0, 0, 0];
  const weekdayTotal = counts.reduce((sum, count) => sum + count, 0);
  const weekend = (counts[0] || 0) + (counts[6] || 0);
  const quietDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].find((_, index) => counts[index] === 0);
  const ranked = tab === 'bookings' ? bookings.topServices : shop.topProducts;
  const topByCount = [...ranked].sort((a, b) => ('bookingCount' in a ? a.bookingCount : a.unitsSold) - ('bookingCount' in b ? b.bookingCount : b.unitsSold)).at(-1);
  const topByMoney = [...ranked].sort((a, b) => a.revenue - b.revenue).at(-1);
  const maxRevenue = Math.max(...ranked.map((row) => row.revenue), 1);
  const nextLabel = nextBookingLabel(bookings.nextBookingDate);

  return (
    <>
      {hideHeader ? null : (
        <EarningsChrome
          title="Analytics"
          subtitle={tab === 'bookings' ? 'How your bookings are doing over the last six months.' : 'How your shop is doing over the last six months.'}
          view="analytics"
          onView={onView}
          leading={
            <div className={styles.modeSwitch} role="tablist" aria-label="Analytics source">
              <button type="button" role="tab" aria-selected={tab === 'bookings'} onClick={() => setTab('bookings')}>Bookings</button>
              <button type="button" role="tab" aria-selected={tab === 'shop'} onClick={() => setTab('shop')}>Shop</button>
            </div>
          }
        />
      )}
      <div className={styles.earnTop}>
        <section className={styles.earn}>
          <div>
            <p className={styles.eyebrow}>{tab === 'bookings' ? 'Booking income, last 6 months' : 'Shop income, last 6 months'}</p>
            <p className={styles.big}>{formatNaira(income / 100)}</p>
            <p className={styles.quiet}>After fees, {rangeLabel}.</p>
            <p className={styles.quiet}>{summary}</p>
          </div>
          <div>
            <div className={styles.chartHead}>
              <span>{tab === 'bookings' ? 'Booking income by month' : 'Shop income by month'}</span>
            </div>
            {maxIncome === 0 ? (
              <EmptyState icon={BarChart3} title="No income in this range" body="Recorded payments will show up here." />
            ) : (
              <div className={`${styles.chart} ${styles.chartInk}`}>
                {series.map((row, index) => (
                  <div key={row.month} className={styles.barCol}>
                    {row.income > 0 && (row.income === maxIncome || index === series.length - 1) ? (
                      <span className={styles.barLabel}>{formatNaira(row.income / 100)}</span>
                    ) : <span />}
                    <span
                      className={`${styles.barFill} ${index === series.length - 1 ? styles.barNow : ''}`}
                      style={{ height: `${Math.max(8, Math.round((row.income / maxIncome) * 100))}%` }}
                    />
                    <span className={`${styles.barLabel} ${index === series.length - 1 ? styles.barLabelNow : ''}`}>
                      {index === series.length - 1 ? `${row.month} so far` : row.month}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {tab === 'bookings' ? (
            <>
              <article className={styles.summaryCard}><span>Booked this month</span><strong>{bookings.bookingsThisMonth}</strong><em>{bookings.bookingsLastMonth} in all of last month</em></article>
              <article className={styles.summaryCard}><span>Upcoming</span><strong>{bookings.upcomingBookings}</strong><em>{nextLabel}</em></article>
              <article className={styles.summaryCard}><span>Average booking</span><strong>{formatNaira(bookings.averageBookingValue / 100)}</strong><em>Before fees</em></article>
              <article className={styles.summaryCard}><span>All-time bookings</span><strong>{bookings.totalBookings}</strong><em>On this account</em></article>
            </>
          ) : (
            <>
              <article className={styles.summaryCard}><span>Orders this month</span><strong>{shop.ordersThisMonth}</strong><em>{shop.ordersLastMonth} in all of last month</em></article>
              <article className={styles.summaryCard}><span>Products sold</span><strong>{shop.productsSold}</strong><em>Units on paid orders</em></article>
              <article className={styles.summaryCard}><span>Average order</span><strong>{formatNaira(shop.averageOrderValue / 100)}</strong><em>Before fees</em></article>
              <article className={styles.summaryCard}><span>All-time orders</span><strong>{shop.totalOrders}</strong><em>On this account</em></article>
            </>
          )}
        </div>
      </div>
      <div className={styles.homeSplit}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>{tab === 'bookings' ? 'Top services' : 'Top products'}</h2>
            <span className={styles.asideMeta}>By income, last 6 months</span>
          </div>
          {ranked.length === 0 ? (
            <EmptyState icon={BarChart3} title={tab === 'bookings' ? 'No services yet' : 'No products sold yet'} body="Paid sales will show up here." />
          ) : ranked.map((row) => {
            const count = 'bookingCount' in row ? row.bookingCount : row.unitsSold;
            const unit = tab === 'bookings' ? 'booking' : 'sold';
            return (
              <div key={row.id} className={styles.mix}>
                <span style={{ width: 'auto' }}>{row.name} · {count} {unit}{count === 1 ? '' : 's'}</span>
                <span className={styles.mixBar} aria-hidden="true"><i style={{ width: `${Math.round((row.revenue / maxRevenue) * 100)}%` }} /></span>
                <b>{formatNaira(row.revenue / 100)}</b>
              </div>
            );
          })}
          {topByCount && topByMoney ? (
            <div className={styles.cardFoot}>
              <span>
                {topByCount.name} is {tab === 'bookings' ? 'booked' : 'sold'} most often. {topByMoney.name} brings in the most money.
              </span>
            </div>
          ) : null}
        </section>
        <section className={styles.collectCard}>
          <div className={styles.cardHead}>
            <h2>Busiest days</h2>
            <span className={styles.asideMeta}>{weekdayTotal} {tab === 'bookings' ? 'bookings' : 'orders'}, last 6 months</span>
          </div>
          {weekdayTotal === 0 ? (
            <EmptyState icon={Calendar} title="No days to chart yet" body="They will show up here once you have some." />
          ) : (
            <div className={`${styles.chart} ${styles.chartInk}`}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, index) => {
                const count = counts[[1, 2, 3, 4, 5, 6, 0][index]] || 0;
                const max = Math.max(...counts, 1);
                return (
                  <div key={label} className={styles.barCol}>
                    {count > 0 ? <span className={styles.barLabel}>{count}</span> : <span />}
                    <span className={`${styles.barFill} ${count === Math.max(...counts) ? styles.barNow : ''}`} style={{ height: `${Math.max(count === 0 ? 0 : 8, Math.round((count / max) * 100))}%` }} />
                    <span className={styles.barLabel}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p className={styles.quiet}>
            {weekdayTotal === 0
              ? 'Nothing recorded in the last six months.'
              : `${weekend} of ${weekdayTotal} fell on a weekend.${quietDay ? ` No one has ${tab === 'bookings' ? 'booked' : 'ordered'} a ${quietDay}.` : ''}`}
          </p>
          {tab === 'bookings' ? (
            <Link href="/bookings?tab=availability" className={styles.textLink}>
              Edit availability
              <ArrowRight strokeWidth={1.75} />
            </Link>
          ) : (
            <Link href="/shop" className={styles.textLink}>
              Open shop
              <ArrowRight strokeWidth={1.75} />
            </Link>
          )}
        </section>
      </div>
    </>
  );
}

function nextBookingLabel(iso: string | null) {
  if (!iso) return 'None scheduled';
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days <= 0) return 'Next is today';
  if (days === 1) return 'Next is tomorrow';
  return `Next is ${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
}
