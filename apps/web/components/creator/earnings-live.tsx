'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, Check, Landmark } from 'lucide-react';
import { formatNaira } from '@foleio/utils';
import styles from '@/components/demo/demo-dashboard.module.css';
import { EmptyState } from '@/components/demo/EmptyState';
import { platformFeeFromGross } from '@/lib/billing/platform-fee-calc';
import {
  PLATFORM_FEE_PERCENT,
  PLATFORM_PLAN_AMOUNTS_KOBO,
  formatFreeFeeLabel,
  formatProFeeLabel,
  normalizePlatformPlan,
} from '@/lib/billing/platform-plans';

export type EarningsView = 'earnings' | 'payouts' | 'analytics';

export type LiveTransaction = {
  id: string;
  createdAt: string;
  status: string;
  type: string;
  amount: number | string;
  creatorEarnings?: number | string | null;
  platformFee?: number | string | null;
  metadata?: {
    service?: string;
    customerName?: string;
    bookingId?: string;
    balanceAmount?: number;
    orderId?: string;
  };
};

type Bank = {
  bankName: string;
  accountNumber: string;
  accountName: string;
} | null;

const PREVIEW = 6;

export function EarningsChrome({
  title,
  subtitle,
  view,
  onView,
  leading,
}: {
  title: string;
  subtitle: string;
  view: EarningsView;
  onView?: (view: EarningsView) => void;
  leading?: ReactNode;
}) {
  return (
    <header className={styles.pageHead}>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className={styles.headTools}>
        {leading}
        <div className={styles.modeSwitch} role="tablist" aria-label="Earnings views">
          <button type="button" role="tab" aria-selected={view === 'earnings'} onClick={() => onView?.('earnings')} data-tour="earnings-tab">
            Earnings
          </button>
          <button type="button" role="tab" aria-selected={view === 'payouts'} onClick={() => onView?.('payouts')}>
            Payouts
          </button>
          <button type="button" role="tab" aria-selected={view === 'analytics'} onClick={() => onView?.('analytics')} data-tour="analytics">
            Analytics
          </button>
        </div>
      </div>
    </header>
  );
}

function naira(kobo: number) {
  return formatNaira((Number.isFinite(kobo) ? kobo : 0) / 100);
}

function money(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function paymentKind(type: string): 'bookings' | 'shop' | 'quotes' | 'other' {
  const value = type.toLowerCase();
  if (value.includes('shop')) return 'shop';
  if (value.includes('quote') || value.includes('invoice')) return 'quotes';
  if (value === 'booking' || value === 'deposit') return 'bookings';
  return 'other';
}

function kindLabel(kind: ReturnType<typeof paymentKind>) {
  if (kind === 'shop') return 'Shop';
  if (kind === 'quotes') return 'Quote';
  if (kind === 'bookings') return 'Booking';
  return 'Payment';
}

function isDisputed(status: string) {
  return status.toLowerCase().includes('dispute');
}

function isPending(status: string) {
  const value = status.toLowerCase();
  return value === 'pending' || value === 'processing';
}

function statusPill(status: string) {
  if (isDisputed(status)) return { label: 'Disputed', className: styles.pillDispute, icon: '!' };
  if (isPending(status)) return { label: 'On its way', className: styles.pillWay, icon: '•' };
  return { label: 'In your bank', className: styles.pillBank, icon: '✓' };
}

function inRange(iso: string, start: Date, end: Date) {
  const time = new Date(iso).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function periodBounds(period: 'month' | 'last' | 'year', now = new Date()) {
  if (period === 'year') {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      label: 'Earnings this year',
    };
  }
  if (period === 'last') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, label: 'Earnings last month' };
  }
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    label: 'Earnings this month',
  };
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthName(date: Date) {
  return date.toLocaleDateString('en-GB', { month: 'long' });
}

function shortDate(date: Date) {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function weekStart(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day));
  return next;
}

function nextBusinessDay(from: Date) {
  const date = new Date(from);
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  return date;
}

export function EarningsLive({
  view,
  onView,
  transactions,
  monthlyEarnings,
  outstanding,
  plan,
  onExport,
  exporting,
}: {
  view: EarningsView;
  onView?: (view: EarningsView) => void;
  transactions: LiveTransaction[];
  monthlyEarnings: Array<{ month: string; amount: number }>;
  outstanding: number;
  plan: string | null;
  onExport: () => void;
  exporting: boolean;
}) {
  const [period, setPeriod] = useState<'month' | 'last' | 'year'>('month');
  const [kind, setKind] = useState<'all' | 'bookings' | 'shop' | 'quotes'>('all');
  const [showAll, setShowAll] = useState(false);
  const now = new Date();
  const bounds = periodBounds(period, now);
  const rows = transactions.filter((row) => inRange(row.createdAt, bounds.start, bounds.end));
  const net = rows.reduce((sum, row) => sum + money(row.creatorEarnings), 0);
  const gross = rows.reduce((sum, row) => sum + money(row.amount), 0);
  const fees = rows.reduce((sum, row) => sum + money(row.platformFee), 0);
  const recordedMonth = monthlyEarnings.find((row) => row.month === monthKey(bounds.start))?.amount;
  const headline = period === 'year' ? net : recordedMonth ?? net;
  const previousStart = new Date(bounds.start.getFullYear(), bounds.start.getMonth() - 1, 1);
  const previousAmount = monthlyEarnings.find((row) => row.month === monthKey(previousStart))?.amount ?? 0;
  const delta = period === 'month' ? headline - previousAmount : 0;
  const depositNet = rows
    .filter((row) => row.type === 'deposit')
    .reduce((sum, row) => sum + money(row.creatorEarnings), 0);
  const weeks = buildWeeks(bounds.start, period === 'month' ? now : bounds.end, rows);
  const maxWeek = Math.max(...weeks.map((week) => week.amount), 0);
  const currentWeek = weeks[weeks.length - 1];
  const sources = sourceMix(rows);
  const counts = {
    all: rows.length,
    bookings: rows.filter((row) => paymentKind(row.type) === 'bookings').length,
    shop: rows.filter((row) => paymentKind(row.type) === 'shop').length,
    quotes: rows.filter((row) => paymentKind(row.type) === 'quotes').length,
  };
  const visible = rows.filter((row) => kind === 'all' || paymentKind(row.type) === kind);
  const shown = showAll ? visible : visible.slice(0, PREVIEW);
  const freePlan = normalizePlatformPlan(plan) === 'STARTER';
  const proFees = rows.reduce(
    (sum, row) => sum + platformFeeFromGross(money(row.amount), PLATFORM_FEE_PERCENT.pro).platformFee,
    0
  );
  const planCost = period === 'year' ? PLATFORM_PLAN_AMOUNTS_KOBO.pro.monthly * (now.getMonth() + 1) : PLATFORM_PLAN_AMOUNTS_KOBO.pro.monthly;
  const savings = fees - (proFees + planCost);
  const balanceCount = rows.filter((row) => row.type === 'deposit' && money(row.metadata?.balanceAmount) > 0).length;

  return (
    <>
      <EarningsChrome
        title="Earnings"
        subtitle="What you have made after fees, and where it came from."
        view={view}
        onView={onView}
        leading={
          <div className={styles.modeSwitch} role="tablist" aria-label="Earnings period">
            {(
              [
                ['month', 'This month'],
                ['last', 'Last month'],
                ['year', 'This year'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={period === id} onClick={() => { setPeriod(id); setShowAll(false); }}>
                {label}
              </button>
            ))}
          </div>
        }
      />
      <div className={styles.earnTop}>
        <section className={styles.earn}>
          <div>
            <p className={styles.eyebrow}>{bounds.label}</p>
            <p className={styles.big}>{naira(headline)}</p>
            {period === 'month' && previousAmount > 0 ? (
              <p className={styles.delta}>
                <span className={`${styles.pill} ${delta >= 0 ? styles.pillPaid : styles.pillWait}`}>
                  {delta >= 0 ? '↑' : '↓'} {naira(Math.abs(delta))}
                </span>
                {delta >= 0 ? 'more' : 'less'} than all of {monthName(previousStart)}
              </p>
            ) : null}
            <p className={styles.quiet}>
              {period === 'month'
                ? `${now.getDate()} days into ${monthName(now)}. ${monthName(previousStart)} closed at ${naira(previousAmount)}.`
                : period === 'last'
                  ? `All of ${monthName(bounds.start)}, after fees.`
                  : 'After fees, from payments already recorded this year.'}
            </p>
          </div>
          <div>
            <div className={styles.chartHead}>
              <span>Earnings by week</span>
              <strong>
                {currentWeek && currentWeek.amount > 0
                  ? `${naira(currentWeek.amount)} ${period === 'month' ? 'so far this week' : 'in the last week'}`
                  : 'No payments in this range'}
              </strong>
            </div>
            {maxWeek === 0 ? (
              <EmptyState icon={BarChart3} title="No earnings in this range" body="Recorded payments will show up here." />
            ) : (
              <div className={`${styles.chart} ${styles.chartInk}`}>
                {weeks.map((week, index) => (
                  <div key={week.key} className={styles.barCol}>
                    <span
                      className={`${styles.barFill} ${index === weeks.length - 1 ? styles.barNow : ''}`}
                      style={{ height: `${Math.max(8, Math.round((week.amount / maxWeek) * 100))}%` }}
                    />
                    <span className={`${styles.barLabel} ${index === weeks.length - 1 ? styles.barLabelNow : ''}`}>
                      {week.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        <section className={styles.collectCard}>
          <p className={styles.eyebrow}>Where it came from</p>
          {sources.length === 0 ? (
            <EmptyState icon={BarChart3} title="No payments in this range" body="Quotes, bookings, and shop sales will show up here." />
          ) : sources.map((source) => (
            <div key={source.label}>
              <div className={styles.mix}>
                <span>{source.label}</span>
                <span className={styles.mixBar} aria-hidden="true"><i style={{ width: `${source.percent}%` }} /></span>
                <b>{naira(source.amount)} · {source.percent}%</b>
              </div>
              {source.label === 'Bookings' && depositNet > 0 ? (
                <p className={styles.mixNote}>{naira(depositNet)} of it is a deposit, with the balance still to come.</p>
              ) : null}
            </div>
          ))}
        </section>
      </div>
      <div className={styles.earnStats}>
        <article className={styles.summaryCard}>
          <span>Sales before fees</span>
          <strong>{naira(gross)}</strong>
          <em>{rows.length} payment{rows.length === 1 ? '' : 's'} {period === 'last' ? `in ${monthName(bounds.start)}` : period === 'year' ? 'this year' : 'this month'}</em>
        </article>
        <article className={styles.summaryCard}>
          <span>Fees</span>
          <strong>{naira(fees)}</strong>
          <em>{(freePlan ? formatFreeFeeLabel() : formatProFeeLabel())} on each payment</em>
        </article>
        <article className={styles.summaryCard}>
          <span>Still owed by clients</span>
          <strong>{naira(outstanding)}</strong>
          <em>
            {balanceCount > 0 ? `${balanceCount} balance${balanceCount === 1 ? '' : 's'}` : 'Balances clients still owe'}
            {' · '}
            <Link href="/bookings" className={`${styles.textLink} ${styles.inlineLink}`}>
              See bookings
              <ArrowRight strokeWidth={1.75} />
            </Link>
          </em>
        </article>
        {freePlan && savings > 0 ? (
          <article className={styles.proCard}>
            <p>Pro would have cost you <strong>{naira(savings)}</strong> less</p>
            <p>
              {naira(proFees)} in fees plus {naira(planCost)} for the plan, against {naira(fees)} on Free.
            </p>
            <Link href="/settings?tab=billing" className={styles.lightButton}>See Pro</Link>
          </article>
        ) : (
          <article className={styles.summaryCard}>
            <span>Plan</span>
            <strong>{freePlan ? 'Free' : 'Pro'}</strong>
            <em>{freePlan ? formatFreeFeeLabel() : 'Your current fee is already applied.'}</em>
          </article>
        )}
      </div>
      <section className={styles.card}>
        <div className={styles.bookTools}>
          <h2>Payments</h2>
          <div className={styles.modeSwitch} role="tablist" aria-label="Payment source">
            {(
              [
                ['all', 'All', counts.all],
                ['bookings', 'Bookings', counts.bookings],
                ['shop', 'Shop', counts.shop],
                ['quotes', 'Quotes', counts.quotes],
              ] as const
            ).map(([id, label, count]) => (
              <button key={id} type="button" role="tab" aria-selected={kind === id} onClick={() => { setKind(id); setShowAll(false); }}>
                {label}
                <span className={styles.tabCount}>{count}</span>
              </button>
            ))}
          </div>
          <button type="button" className={styles.ghost} onClick={onExport} disabled={exporting}>
            {exporting ? 'Downloading…' : 'Download CSV'}
          </button>
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={BarChart3} title="No payments in this view" body="Recorded payments will show up here." />
        ) : (
          <div className={styles.tableWrap}>
            <div className={`${styles.tr} ${styles.th}`}>
              <span>Date</span>
              <span>Payment</span>
              <span>Sale</span>
              <span>Fee</span>
              <span>You got</span>
              <span>Status</span>
            </div>
            {shown.map((row) => {
              const status = statusPill(row.status);
              const kindName = kindLabel(paymentKind(row.type));
              const who = row.metadata?.customerName;
              return (
                <div key={row.id} className={styles.tr}>
                  <span className={styles.asideMeta}>{shortDate(new Date(row.createdAt))}</span>
                  <div className={styles.goodsText}>
                    <strong>{row.metadata?.service || kindName}</strong>
                    <span>{[kindName, who].filter(Boolean).join(' · ')}</span>
                  </div>
                  <span className={styles.num}>{naira(money(row.amount))}</span>
                  <span className={styles.fee}>{money(row.platformFee) > 0 ? `−${naira(money(row.platformFee))}` : naira(0)}</span>
                  <span className={styles.num}>{naira(money(row.creatorEarnings))}</span>
                  <span className={`${styles.pill} ${status.className}`}>{status.icon} {status.label}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className={styles.cardFoot}>
          <span>Showing {shown.length} of {visible.length} payment{visible.length === 1 ? '' : 's'} {period === 'year' ? 'this year' : 'this month'}</span>
          {visible.length > PREVIEW ? (
            <button type="button" className={`${styles.textLink} ${styles.inlineLink}`} onClick={() => setShowAll((open) => !open)}>
              {showAll ? 'Show less' : 'Show all'}
              <ArrowRight strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
      </section>
    </>
  );
}

function buildWeeks(start: Date, end: Date, rows: LiveTransaction[]) {
  const weeks: Array<{ key: string; label: string; amount: number }> = [];
  const cursor = weekStart(start);
  const last = weekStart(end);
  while (cursor.getTime() <= last.getTime() && weeks.length < 8) {
    const key = cursor.toISOString().slice(0, 10);
    const next = new Date(cursor);
    next.setDate(next.getDate() + 7);
    const amount = rows
      .filter((row) => {
        const time = new Date(row.createdAt).getTime();
        return time >= cursor.getTime() && time < next.getTime();
      })
      .reduce((sum, row) => sum + money(row.creatorEarnings), 0);
    weeks.push({
      key,
      label: cursor.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      amount,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

function sourceMix(rows: LiveTransaction[]) {
  const groups = [
    { label: 'Quotes', kinds: ['quotes'] },
    { label: 'Bookings', kinds: ['bookings'] },
    { label: 'Shop', kinds: ['shop'] },
  ] as const;
  const totals = groups.map((group) => ({
    label: group.label,
    amount: rows
      .filter((row) => (group.kinds as readonly string[]).includes(paymentKind(row.type)))
      .reduce((sum, row) => sum + money(row.creatorEarnings), 0),
  })).filter((row) => row.amount > 0);
  const total = totals.reduce((sum, row) => sum + row.amount, 0) || 1;
  return totals.map((row) => ({ ...row, percent: Math.round((row.amount / total) * 100) }));
}

export function PayoutsLive({
  view,
  onView,
  transactions,
  bank,
  onEditBank,
  bankEditor,
  onExport,
  exporting,
}: {
  view: EarningsView;
  onView?: (view: EarningsView) => void;
  transactions: LiveTransaction[];
  bank: Bank;
  onEditBank: () => void;
  bankEditor: ReactNode;
  onExport: () => void;
  exporting: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const pending = transactions.filter((row) => isPending(row.status));
  const settled = transactions.filter((row) => !isPending(row.status));
  const onTheWay = pending.reduce((sum, row) => sum + money(row.creatorEarnings), 0);
  const lead = pending[0];
  const expected = pending.length ? nextBusinessDay(now) : null;
  const monthSettled = settled.filter((row) => new Date(row.createdAt) >= monthStart);
  const settledTotal = monthSettled.reduce((sum, row) => sum + money(row.creatorEarnings), 0);
  const last = settled[0];
  const disputed = transactions.filter((row) => isDisputed(row.status));
  const groups = groupPayouts(pending, settled);
  const flat = groups.flatMap((group) => group.rows);
  const shownGroups = showAll ? groups : trimGroups(groups, PREVIEW);
  const shownCount = shownGroups.reduce((sum, group) => sum + group.rows.length, 0);
  const subtitle = onTheWay > 0 && expected
    ? `${naira(onTheWay)} is on its way. It should reach your bank on ${expected.toLocaleDateString('en-GB', { weekday: 'long' })}.`
    : 'Nothing is on its way to your bank.';

  return (
    <>
      <EarningsChrome title="Payouts" subtitle={subtitle} view={view} onView={onView} />
      <div className={styles.payoutTop}>
        <section className={styles.ink}>
          <p className={styles.eyebrow}>On its way to your bank</p>
          <p className={styles.big}>{naira(onTheWay)}</p>
          {lead && expected ? (
            <>
              <p className={styles.quiet}>
                Expected {expected.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {bank ? ` · ${bank.bankName} ··${bank.accountNumber.slice(-4)}` : ''}
              </p>
              <p className={styles.quiet}>
                {pending.length === 1
                  ? `One payment: ${lead.metadata?.service || 'Payment'}${lead.metadata?.customerName ? `, ${lead.metadata.customerName}` : ''}`
                  : `${pending.length} payments are settling.`}
              </p>
              <div className={styles.rail}>
                <div>
                  <i className={styles.railOn} />
                  <strong><Check className={styles.tick} strokeWidth={2.25} aria-hidden="true" /> Paid</strong>
                  <span>{shortDate(new Date(lead.createdAt))}</span>
                </div>
                <div>
                  <i className={styles.railMid} />
                  <strong>Settling now</strong>
                  <span>Paystack, on the next business day</span>
                </div>
                <div>
                  <i />
                  <strong>In your bank</strong>
                  <span>{expected.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, expected</span>
                </div>
              </div>
            </>
          ) : (
            <p className={styles.quiet}>Paid amounts that are still settling will show up here.</p>
          )}
        </section>
        <div className={styles.stack}>
          <article className={styles.summaryCard}>
            <span>Settled this month</span>
            <strong>{naira(settledTotal)}</strong>
            <em>{monthSettled.length} payout{monthSettled.length === 1 ? '' : 's'} since 1 {now.toLocaleDateString('en-GB', { month: 'short' })}</em>
          </article>
          <article className={styles.summaryCard}>
            <span>Last payout</span>
            <strong>{last ? naira(money(last.creatorEarnings)) : naira(0)}</strong>
            <em>{last ? shortDate(new Date(last.createdAt)) : 'None recorded yet'}</em>
          </article>
        </div>
      </div>
      <div className={styles.bookLayout}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>{monthName(now)} payouts</h2>
            <button type="button" className={styles.ghost} onClick={onExport} disabled={exporting}>
              {exporting ? 'Downloading…' : 'Download CSV'}
            </button>
          </div>
          {flat.length === 0 ? (
            <EmptyState icon={Landmark} title="No payouts yet" body="Settled payments will show up here." />
          ) : shownGroups.map((group) => (
            <div key={group.name}>
              <p className={styles.bookGroup}>{group.name}</p>
              {group.rows.map((row) => {
                const status = statusPill(row.status);
                const when = new Date(row.displayDate);
                return (
                  <div key={row.id} className={styles.sched}>
                    <span className={styles.dateBox}>
                      <span>{when.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                      <strong>{when.getDate()}</strong>
                    </span>
                    <div className={styles.schedWho}>
                      <strong>{row.title}</strong>
                      <span>
                        {row.detail}
                        {row.flag ? <em className={styles.flag}>{row.flag}</em> : null}
                      </span>
                    </div>
                    <div className={styles.schedAmount}>
                      <strong>{naira(row.amount)}</strong>
                    </div>
                    <span className={`${styles.pill} ${status.className}`}>{status.icon} {status.label}</span>
                    <ArrowRight className={styles.schedArrow} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          ))}
          <div className={styles.cardFoot}>
            <span>Showing {shownCount} of {flat.length} payout{flat.length === 1 ? '' : 's'} this month</span>
            {flat.length > PREVIEW ? (
              <button type="button" className={`${styles.textLink} ${styles.inlineLink}`} onClick={() => setShowAll((open) => !open)}>
                {showAll ? 'Show less' : 'Show all'}
                <ArrowRight strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
        </section>
        <aside className={styles.bookSide}>
          <section className={styles.collectCard}>
            <p className={styles.dotLine}>
              <i className={bank ? styles.dotGreen : styles.dotRose} />
              {bank ? 'Payouts are on' : 'No payout account yet'}
            </p>
            <h2 className={styles.sideTitle}>
              {bank ? `${bank.bankName} ··${bank.accountNumber.slice(-4)}` : 'Add a bank account'}
            </h2>
            <p className={styles.quiet}>{bank?.accountName || 'Payments settle here once a bank is saved.'}</p>
            {bank ? (
              <button type="button" className={`${styles.ghost} ${styles.spaced}`} onClick={onEditBank}>
                Change bank account
              </button>
            ) : null}
            {bankEditor}
          </section>
          {disputed[0] ? (
            <section className={styles.card}>
              <p className={styles.dotLine}>
                <i className={styles.dotRose} />
                One paid-out payment is disputed
              </p>
              <p className={styles.sideCopy}>
                {disputed[0].metadata?.customerName || 'A client'} disputed {disputed[0].metadata?.service || 'a payment'}
                {money(disputed[0].amount) > 0 ? ` of ${naira(money(disputed[0].amount))}` : ''}. If it is refunded, {naira(money(disputed[0].creatorEarnings))} comes off a later payout.
              </p>
              <Link href="/bookings?tab=disputed" className={styles.textLink}>
                Review dispute
                <ArrowRight strokeWidth={1.75} />
              </Link>
            </section>
          ) : null}
          <section className={styles.card}>
            <h2 className={styles.sideTitle}>How payouts work</h2>
            <p className={styles.sideCopy}>
              Paystack sends each day’s payments to your bank on the next business day. Payments made from Friday to Sunday arrive on Monday.
            </p>
            <p className={styles.sideCopy}>
              Fees are taken out before the payout. Expected dates are estimates until your bank confirms.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function groupPayouts(pending: LiveTransaction[], settled: LiveTransaction[]) {
  const expected = pending.map((row) => ({
    id: row.id,
    title: row.metadata?.service || 'Payment',
    detail: `1 payment from ${shortDate(new Date(row.createdAt))}`,
    flag: '',
    amount: money(row.creatorEarnings),
    status: row.status,
    displayDate: nextBusinessDay(new Date()).toISOString(),
  }));
  const byDay = new Map<string, LiveTransaction[]>();
  for (const row of settled) {
    const key = new Date(row.createdAt).toDateString();
    byDay.set(key, [...(byDay.get(key) || []), row]);
  }
  const banked = Array.from(byDay.entries()).map(([key, dayRows]) => {
    const disputed = dayRows.filter((row) => isDisputed(row.status));
    return {
      id: key,
      title: dayRows.length === 1 ? (dayRows[0].metadata?.service || 'Payment') : `${dayRows.length} payments`,
      detail: dayRows.length === 1
        ? `1 payment from ${shortDate(new Date(dayRows[0].createdAt))}`
        : dayRows.map((row) => row.metadata?.service).filter(Boolean).slice(0, 2).join(' · '),
      flag: disputed.length ? ' one is disputed' : '',
      amount: dayRows.reduce((sum, row) => sum + money(row.creatorEarnings), 0),
      status: disputed.length ? disputed[0].status : dayRows[0].status,
      displayDate: dayRows[0].createdAt,
    };
  });
  return [
    expected.length ? { name: 'Expected', rows: expected } : null,
    banked.length ? { name: 'In your bank', rows: banked } : null,
  ].filter((group): group is { name: string; rows: typeof expected } => Boolean(group));
}

function trimGroups(groups: ReturnType<typeof groupPayouts>, limit: number) {
  let left = limit;
  return groups
    .map((group) => {
      const rows = group.rows.slice(0, left);
      left -= rows.length;
      return { ...group, rows };
    })
    .filter((group) => group.rows.length > 0);
}
