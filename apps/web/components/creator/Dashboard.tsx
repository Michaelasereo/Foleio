'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, Bell, Calendar, Check, FileText, Package, ShoppingBag, Wallet } from 'lucide-react';
import { EmptyState } from '@/components/demo/EmptyState';
import { formatNaira } from '@foleio/utils';
import styles from '@/components/demo/demo-dashboard.module.css';
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { WelcomeModal } from '@/components/creator/WelcomeModal';
import { OnboardingGateModal } from '@/components/creator/OnboardingGateModal';
import { TourTooltip, type TourStep } from '@/components/onboarding/TourTooltip';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import { getCreatorPlan } from '@/lib/utils/plan-limits';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

type UpcomingBooking = {
  id: string;
  customerName: string;
  bookingDate: string | Date;
  startTime?: string | null;
  totalAmount: number;
  balanceAmount?: number;
  status: string;
  customerAddress?: string;
  priceListItem?: { name: string } | null;
};

type QuoteRowData = {
  id: string;
  title: string;
  customerName: string;
  totalAmount: number;
  status: string;
  serviceDate?: string | Date | null;
};

type OrderRow = {
  id: string;
  status: string;
  total: number;
  createdAt: string | Date;
  deliveryAddress?: unknown;
  items: Array<{ product: { name: string } | null }>;
};

type PaymentRow = {
  id: string;
  createdAt: string | Date;
  type: string;
  creatorEarnings: number;
  platformFee: number;
  metadata?: unknown;
};

type WeekBar = { label: string; amount: number };
type StockRow = { id: string; name: string; stock: number | null; price: number };
type PreorderRow = { id: string; name: string; price: number };

interface CreatorDashboardProps {
  creator: any;
  profileIncomplete?: boolean;
  analytics: any;
  bookingStats: {
    totalBookings: number;
    upcomingBookings: number;
  };
  upcomingBookings: UpcomingBooking[];
  quotes?: QuoteRowData[];
  orders?: OrderRow[];
  payments?: PaymentRow[];
  weeks?: WeekBar[];
  lowStock?: StockRow[];
  preorders?: PreorderRow[];
  bankLabel?: string | null;
}

export function CreatorDashboard({
  creator,
  profileIncomplete = false,
  analytics,
  bookingStats,
  upcomingBookings,
  quotes = [],
  orders = [],
  payments = [],
  weeks = [],
  lowStock = [],
  preorders = [],
  bankLabel = null,
}: CreatorDashboardProps) {
  const [creatorState, setCreatorState] = useState(creator);
  const { isOpen, limitType, closeUpgradeModal } = useUpgradeModal();
  const { isActive, currentStep, startTour, nextStep, skipTour, completeTour } =
    useOnboardingTour();
  const hasStartedTourRef = useRef(false);
  const currentPlan = getCreatorPlan(creatorState.platformPlan ?? null);

  const tourSteps = useMemo<TourStep[]>(
    () => [
      {
        target: '[data-tour="dashboard"]',
        text: 'This is your home base. See your bookings, earnings, and performance at a glance.',
        position: 'bottom',
      },
      {
        target: '[data-tour="earnings"]',
        text: 'Track revenue, open Analytics from the Earnings tab, and connect your bank so payments can settle to you.',
        position: 'bottom',
      },
      {
        target: '[data-tour="creator-profile"]',
        text: "Update your profile photo and share your profile card with your audience.",
        position: 'right',
      },
    ],
    []
  );

  useEffect(() => {
    const shouldStartTour =
      !profileIncomplete &&
      Boolean(creatorState.hasSeenWelcome) &&
      !Boolean(creatorState.hasCompletedTour);

    if (!shouldStartTour || hasStartedTourRef.current) return;

    const timer = window.setTimeout(() => {
      startTour();
      hasStartedTourRef.current = true;
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    creatorState.hasCompletedTour,
    creatorState.hasSeenWelcome,
    profileIncomplete,
    startTour,
  ]);

  const handleSkipTour = () => {
    void skipTour();
    setCreatorState((prev: any) => ({
      ...prev,
      hasCompletedTour: true,
    }));
  };

  const handleCompleteTour = () => {
    void completeTour();
    setCreatorState((prev: any) => ({
      ...prev,
      hasCompletedTour: true,
    }));
  };

  const monthEarnings = formatNaira(Number(analytics?.currentMonth || 0) / 100);
  const nextBooking = upcomingBookings[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const openOrders = orders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled');
  const balanceDue = upcomingBookings.filter((booking) => Number(booking.balanceAmount || 0) > 0);
  const balanceTotal = balanceDue.reduce((sum, booking) => sum + Number(booking.balanceAmount || 0), 0);
  const openQuotes = quotes.filter((quote) => quote.status === 'draft' || quote.status === 'sent');
  const maxWeek = Math.max(...weeks.map((week) => week.amount), 1);
  const thisWeek = weeks[weeks.length - 1];
  const plan = String(creatorState.platformPlan || 'free').toLowerCase();
  const [mode, setMode] = useState<'bookings' | 'products'>('bookings');

  const needs = [
    ...balanceDue.slice(0, 1).map((booking) => ({
      title: 'Balance still due',
      meta: `${booking.customerName} · ${formatNaira(Number(booking.balanceAmount || 0) / 100)}`,
      href: '/bookings',
    })),
    ...openQuotes.slice(0, 1).map((quote) => ({
      title: quote.status === 'draft' ? 'Quote still a draft' : 'Quote not paid yet',
      meta: `${quote.customerName} · ${formatNaira(quote.totalAmount / 100)}`,
      href: '/invoices',
    })),
    ...openOrders.slice(0, 1).map((order) => ({
      title: 'Order to deliver',
      meta: orderLabel(order),
      href: '/shop?tab=orders',
    })),
  ];

  return (
    <div className={styles.shell} style={{ display: 'block', minHeight: 0, width: '100%', background: 'transparent' }}>
      {profileIncomplete ? (
        <OnboardingGateModal open userEmail={creatorState?.email || undefined} />
      ) : null}
      {!profileIncomplete && !creatorState.hasSeenWelcome ? (
        <WelcomeModal
          creator={creatorState}
          onClose={() =>
            setCreatorState((prev: any) => ({
              ...prev,
              hasSeenWelcome: true,
            }))
          }
        />
      ) : null}

      <div className={styles.home}>
        <header className={styles.greetRow}>
          <div className={styles.greet}>
            <h1>{greeting}, {creatorState.displayName}.</h1>
            <p>
              {todayLabel}.{' '}
              {mode === 'products'
                ? openOrders.length === 0
                  ? 'No orders waiting to send.'
                  : `${openOrders.length} order${openOrders.length === 1 ? '' : 's'} still to send.`
                : bookingStats.upcomingBookings === 0
                  ? 'Nothing booked for the rest of this month.'
                  : `${bookingStats.upcomingBookings} upcoming this month.`}
            </p>
          </div>
          <div className={styles.modeSwitch} role="group" aria-label="Dashboard type">
            {(['bookings', 'products'] as const).map((item) => (
              <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)}>
                {item === 'bookings' ? 'Bookings' : 'Products'}
              </button>
            ))}
          </div>
        </header>

        {mode === 'products' ? (
          <ProductsHome
            orders={orders}
            openOrders={openOrders}
            payments={payments}
            weeks={weeks}
            maxWeek={maxWeek}
            thisWeek={thisWeek}
            monthEarnings={monthEarnings}
            productsSold={analytics?.shopSetup === true ? Number(analytics?.productsSold || 0) : 0}
            lowStock={lowStock}
            preorders={preorders}
            bankLabel={bankLabel}
            showPlan={plan === 'free'}
          />
        ) : (
          <>
            <div className={styles.homeTop}>
              <section className={styles.nextCard}>
                <div className={styles.nextHead}>
                  <span>{nextBooking ? 'Next up' : 'Next up'}</span>
                  {nextBooking ? <StatusChip status={nextBooking.status} /> : null}
                </div>
                {nextBooking ? (
                  <>
                    <h2>{nextBooking.priceListItem?.name || 'Booking'} for {nextBooking.customerName}</h2>
                    <p>{bookingWhen(nextBooking)} · {formatNaira(Number(nextBooking.totalAmount || 0) / 100)}</p>
                  </>
                ) : (
                  <>
                    <h2>No booking on the calendar yet</h2>
                    <p>New appointments will show here.</p>
                  </>
                )}
                <WeekStrip bookings={upcomingBookings} />
                <div className={styles.nextActions}>
                  <Link href="/bookings" className={styles.nextPrimary}>View booking</Link>
                  <Link href="/bookings?tab=availability" className={styles.nextGhost}>
                    Set your availability
                    <ArrowRight strokeWidth={1.75} />
                  </Link>
                </div>
              </section>
              <NeedsCard items={needs} />
            </div>

            <div className={styles.homeMid}>
              <EarningsCard
                monthEarnings={monthEarnings}
                weeks={weeks}
                maxWeek={maxWeek}
                thisWeek={thisWeek}
              />
              <div className={styles.miniStack}>
                <Mini label="Balances to collect" meta={balanceDue.length === 0 ? 'No deposit balances due' : `${balanceDue.length} booking${balanceDue.length === 1 ? '' : 's'}`} value={formatNaira(balanceTotal / 100)} />
                <Mini label="Upcoming bookings" meta="Still on the calendar" value={String(upcomingBookings.length)} />
                <Mini label="Products sold" meta={analytics?.shopSetup === true ? 'Paid shop orders' : 'Shop has no products yet'} value={analytics?.shopSetup === true ? String(analytics?.productsSold || 0) : '0'} />
              </div>
            </div>

            <div className={styles.homeSplit}>
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Upcoming bookings</h2>
                  <Link href="/bookings" className={styles.textLink}>
                    View all {bookingStats.totalBookings}
                    <ArrowRight strokeWidth={1.75} />
                  </Link>
                </div>
                {upcomingBookings.length === 0 ? (
                  <EmptyState icon={Calendar} title="No upcoming bookings" body="New appointments will show up here." />
                ) : upcomingBookings.slice(0, 5).map((booking, index) => (
                  <PersonRow
                    key={booking.id}
                    index={index}
                    name={booking.customerName}
                    service={booking.priceListItem?.name || 'Booking'}
                    when={bookingWhen(booking)}
                    amount={bookingAmount(booking)}
                    status={bookingStatus(booking.status).label}
                    statusClass={bookingStatus(booking.status).pill}
                  />
                ))}
              </section>
              <PaymentsCard payments={payments} bankLabel={bankLabel} showPlan={plan === 'free'} />
            </div>

            <div className={styles.homeBottom}>
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Quotes and invoices</h2>
                  <Link href="/invoices" className={styles.textLink}>
                    Send a quote
                    <ArrowRight strokeWidth={1.75} />
                  </Link>
                </div>
                {quotes.length === 0 ? (
                  <EmptyState icon={FileText} title="No quotes yet" body="Quotes you send will show up here." />
                ) : quotes.slice(0, 3).map((quote) => (
                  <SimpleRow
                    key={quote.id}
                    title={quote.title}
                    meta={`${quote.customerName}${quote.serviceDate ? ` · ${new Date(quote.serviceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`}
                    amount={formatNaira(quote.totalAmount / 100)}
                    status={quote.status === 'accepted' || quote.status === 'deposit_paid' ? 'Paid' : quote.status === 'sent' ? 'Not paid' : quote.status.replace(/_/g, ' ')}
                    statusClass={quote.status === 'accepted' || quote.status === 'deposit_paid' ? styles.pillPaid : quote.status === 'declined' || quote.status === 'expired' ? styles.pillAlert : styles.pillWait}
                  />
                ))}
              </section>
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Shop orders</h2>
                  <Link href="/shop?tab=orders" className={styles.textLink}>
                    Open shop
                    <ArrowRight strokeWidth={1.75} />
                  </Link>
                </div>
                {orders.length === 0 ? (
                  <EmptyState icon={ShoppingBag} title="No shop orders yet" body="Paid orders will show up here." />
                ) : orders.slice(0, 3).map((order) => (
                  <SimpleRow
                    key={order.id}
                    title={order.items[0]?.product?.name || 'Order'}
                    meta={orderLabel(order)}
                    amount={formatNaira(order.total / 100)}
                    status={orderStatus(order.status).label}
                    statusClass={orderStatus(order.status).pill}
                  />
                ))}
              </section>
            </div>
          </>
        )}
      </div>

      {limitType ? (
        <UpgradeModal
          isOpen={isOpen}
          onClose={closeUpgradeModal}
          limitType={limitType}
          currentPlan={currentPlan}
        />
      ) : null}
      {isActive ? (
        <TourTooltip
          steps={tourSteps}
          currentStep={currentStep}
          onNext={() => nextStep(tourSteps.length)}
          onSkip={handleSkipTour}
          onDone={handleCompleteTour}
        />
      ) : null}
    </div>
  );
}

function ProductsHome({
  orders,
  openOrders,
  payments,
  weeks,
  maxWeek,
  thisWeek,
  monthEarnings,
  productsSold,
  lowStock,
  preorders,
  bankLabel,
  showPlan,
}: {
  orders: OrderRow[];
  openOrders: OrderRow[];
  payments: PaymentRow[];
  weeks: WeekBar[];
  maxWeek: number;
  thisWeek?: WeekBar;
  monthEarnings: string;
  productsSold: number;
  lowStock: StockRow[];
  preorders: PreorderRow[];
  bankLabel: string | null;
  showPlan: boolean;
}) {
  const next = openOrders[0] || orders[0];
  return (
    <>
      <div className={styles.homeTop}>
        <section className={styles.nextCard}>
          <div className={styles.nextHead}>
            <span>Next up</span>
            {next ? <span className={styles.paidChip}><Check strokeWidth={2} />{orderStatus(next.status).label}</span> : null}
          </div>
          {next ? (
            <>
              <h2>{next.items[0]?.product?.name || 'Order'} for {buyerName(next)}</h2>
              <p>{orderLabel(next)} · {formatNaira(next.total / 100)}</p>
            </>
          ) : (
            <>
              <h2>No order to send yet</h2>
              <p>Paid shop orders will show here.</p>
            </>
          )}
          <WeekStrip dates={orders.map((order) => order.createdAt)} />
          <div className={styles.nextActions}>
            <Link href="/shop?tab=orders" className={styles.nextPrimary}>View order</Link>
            <Link href="/shop" className={styles.nextGhost}>
              Open shop
              <ArrowRight strokeWidth={1.75} />
            </Link>
          </div>
        </section>
        <NeedsCard
          items={openOrders.slice(0, 3).map((order) => ({
            title: order.status === 'delivered' ? 'Delivered' : 'Pack and send',
            meta: orderLabel(order),
            href: '/shop?tab=orders',
          }))}
        />
      </div>
      <div className={styles.homeMid}>
        <EarningsCard monthEarnings={monthEarnings} weeks={weeks} maxWeek={maxWeek} thisWeek={thisWeek} />
        <div className={styles.miniStack}>
          <Mini label="To deliver" meta="Orders not marked delivered" value={String(openOrders.length)} />
          <Mini label="Products sold" meta="Paid shop orders" value={String(productsSold)} />
          <Mini label="Orders" meta="Latest on this account" value={String(orders.length)} />
        </div>
      </div>
      <div className={styles.homeSplit}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Orders</h2>
            <Link href="/shop?tab=orders" className={styles.textLink}>
              View all {orders.length}
              <ArrowRight strokeWidth={1.75} />
            </Link>
          </div>
          {orders.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No orders yet" body="Paid orders will show up here." />
          ) : orders.slice(0, 5).map((order, index) => (
            <PersonRow
              key={order.id}
              index={index}
              name={buyerName(order)}
              service={order.items[0]?.product?.name || 'Order'}
              when={new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              amount={formatNaira(order.total / 100)}
              status={orderStatus(order.status).label}
              statusClass={orderStatus(order.status).pill}
            />
          ))}
        </section>
        <PaymentsCard payments={payments} bankLabel={bankLabel} showPlan={showPlan} />
      </div>
      <div className={styles.homeBottom}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Low stock</h2>
            <Link href="/shop" className={styles.textLink}>
              View products
              <ArrowRight strokeWidth={1.75} />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState icon={Package} title="Nothing is low on stock" body="Products with a few left will show up here." />
          ) : lowStock.map((product) => (
            <SimpleRow key={product.id} title={product.name} meta={`${product.stock ?? 0} left`} amount={formatNaira(product.price / 100)} status="Low" statusClass={styles.pillWait} />
          ))}
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Preorders</h2>
            <Link href="/shop" className={styles.textLink}>
              Open shop
              <ArrowRight strokeWidth={1.75} />
            </Link>
          </div>
          {preorders.length === 0 ? (
            <EmptyState icon={Package} title="No preorder products" body="Products marked as a preorder will show up here." />
          ) : preorders.map((product) => (
            <SimpleRow key={product.id} title={product.name} meta="Marked as a preorder" amount={formatNaira(product.price / 100)} status="Preorder" statusClass={styles.pillDeliver} />
          ))}
        </section>
      </div>
    </>
  );
}

function EarningsCard({
  monthEarnings,
  weeks,
  maxWeek,
  thisWeek,
}: {
  monthEarnings: string;
  weeks: WeekBar[];
  maxWeek: number;
  thisWeek?: WeekBar;
}) {
  const hasEarnings = weeks.some((week) => week.amount > 0);
  return (
    <section className={styles.earn}>
      <div>
        <p className={styles.eyebrow}>Earnings this month</p>
        <p className={styles.big}>{monthEarnings}</p>
        <p className={styles.quiet}>After fees, from payments already recorded</p>
        <Link href="/earnings" className={styles.textLink}>
          Open earnings
          <ArrowRight strokeWidth={1.75} />
        </Link>
      </div>
      <div>
        {hasEarnings ? (
          <>
            <div className={styles.chartHead}>
              <span>Earnings by week</span>
              <strong>{thisWeek ? `${formatNaira(thisWeek.amount / 100)} so far this week` : 'No payments in this range'}</strong>
            </div>
            <div className={styles.chart}>
              {weeks.map((week, index) => (
                <div key={week.label} className={styles.barCol}>
                  <span
                    className={`${styles.barFill} ${index === weeks.length - 1 ? styles.barNow : ''}`}
                    style={{ height: week.amount === 0 ? '0%' : `${Math.max(8, Math.round((week.amount / maxWeek) * 100))}%` }}
                  />
                  <span className={styles.barLabel}>{week.label}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.chartEmpty}>
            <span className={styles.chartEmptyIcon} aria-hidden="true">
              <BarChart3 strokeWidth={1.75} />
            </span>
            <strong>No earnings this month</strong>
            <span>Recorded payments will show up here.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function NeedsCard({ items }: { items: Array<{ title: string; meta: string; href: string }> }) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2>Notifications</h2>
        {items.length > 0 ? <span className={styles.count}>{items.length}</span> : null}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications right now" body="Things that need you will show up here." />
      ) : items.map((item) => (
        <div key={item.title} className={styles.need}>
          <span className={styles.needBell} aria-hidden="true"><Bell strokeWidth={1.75} /></span>
          <div className={styles.needMain}>
            <div className={styles.needTop}>
              <strong>{item.title}</strong>
              <Link href={item.href}>
                View
                <ArrowRight strokeWidth={1.75} />
              </Link>
            </div>
            <span>{item.meta}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

function PaymentsCard({
  payments,
  bankLabel,
  showPlan,
}: {
  payments: PaymentRow[];
  bankLabel: string | null;
  showPlan: boolean;
}) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2>Recent payments</h2>
        {bankLabel ? <span className={styles.quiet}>{bankLabel}</span> : null}
      </div>
      {payments.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments recorded yet" body="Recorded payments will show up here." />
      ) : payments.slice(0, 3).map((payment) => {
        const meta = payment.metadata && typeof payment.metadata === 'object' ? payment.metadata as { service?: string; customerName?: string } : {};
        const fee = payment.platformFee > 0 ? ` · less ${formatNaira(payment.platformFee / 100)} fee` : '';
        return (
          <div key={payment.id} className={styles.pay}>
            <div>
              <strong>{meta.service || payment.type.replace(/_/g, ' ')}</strong>
              <span>
                {new Date(payment.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                {meta.customerName ? ` · ${meta.customerName}` : ''}
                {fee}
              </span>
            </div>
            <strong>{formatNaira(payment.creatorEarnings / 100)}</strong>
          </div>
        );
      })}
      {showPlan ? (
        <div className={styles.proNote}>
          <p>You&apos;re on Free. Plan and fee details are in billing.</p>
          <Link href="/settings?tab=billing">See plans</Link>
        </div>
      ) : null}
    </section>
  );
}

function WeekStrip({ bookings = [], dates = [] }: { bookings?: UpcomingBooking[]; dates?: Array<string | Date> }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    const count = [
      ...bookings.map((booking) => new Date(booking.bookingDate)),
      ...dates.map((value) => new Date(value)),
    ].filter((value) => sameDay(value, date)).length;
    return {
      key: date.toISOString(),
      day: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      date: String(date.getDate()),
      count: count === 0 ? '—' : String(count),
      current: index === 0,
    };
  });
  return (
    <div className={styles.days}>
      {days.map((day) => (
        <div key={day.key} className={`${styles.day} ${day.current ? styles.dayOn : ''}`}>
          <span>{day.day}</span>
          <strong>{day.date}</strong>
          <span>{day.count}</span>
        </div>
      ))}
    </div>
  );
}

function Mini({ label, meta, value }: { label: string; meta: string; value: string }) {
  return (
    <article className={styles.mini}>
      <div>
        <strong>{label}</strong>
        <span>{meta}</span>
      </div>
      <b>{value}</b>
    </article>
  );
}

const TONES = [styles.toneViolet, styles.toneOrange, styles.toneBlue, styles.toneGreen, styles.toneRose];

function PersonRow({
  index,
  name,
  service,
  when,
  amount,
  status,
  statusClass,
}: {
  index: number;
  name: string;
  service: string;
  when: string;
  amount: string;
  status: string;
  statusClass: string;
}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'F';
  return (
    <div className={styles.line}>
      <div className={styles.who}>
        <span className={`${styles.avatar} ${TONES[index % TONES.length]}`}>{initials}</span>
        <div>
          <strong>{name}</strong>
          <span>{service}</span>
        </div>
      </div>
      <span className={styles.when}>{when}</span>
      <strong className={styles.amount}>{amount}</strong>
      <span className={`${styles.pill} ${statusClass}`}>{status}</span>
    </div>
  );
}

function SimpleRow({
  title,
  meta,
  amount,
  status,
  statusClass,
}: {
  title: string;
  meta: string;
  amount: string;
  status: string;
  statusClass: string;
}) {
  return (
    <div className={styles.quote}>
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <strong>{amount}</strong>
      <span className={`${styles.pill} ${statusClass}`}>{status}</span>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const label = bookingStatus(status).label;
  return (
    <span className={styles.paidChip}>
      <Check strokeWidth={2} />
      {label}
    </span>
  );
}

function bookingStatus(status: string) {
  if (status === 'deposit_paid') return { label: 'Deposit paid', pill: styles.pillWait };
  if (status === 'balance_overdue') return { label: 'Balance due', pill: styles.pillAlert };
  if (status === 'disputed') return { label: 'Disputed', pill: styles.pillAlert };
  if (status === 'pending') return { label: 'Pending', pill: styles.pillWait };
  if (status === 'paid' || status === 'first_payout_done' || status === 'service_day' || status === 'completed') {
    return { label: 'Paid in full', pill: styles.pillPaid };
  }
  return { label: status.replace(/_/g, ' '), pill: styles.pillWait };
}

function orderStatus(status: string) {
  if (status === 'delivered') return { label: 'Delivered', pill: styles.pillPaid };
  if (status === 'processing' || status === 'shipped' || status === 'in_progress') return { label: 'To deliver', pill: styles.pillDeliver };
  if (status === 'cancelled' || status === 'canceled') return { label: 'Cancelled', pill: styles.pillAlert };
  return { label: 'To pack', pill: styles.pillWait };
}

function bookingWhen(booking: UpcomingBooking) {
  const date = new Date(booking.bookingDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return booking.startTime ? `${date} · ${booking.startTime}` : date;
}

function bookingAmount(booking: UpcomingBooking) {
  const total = formatNaira(Number(booking.totalAmount || 0) / 100);
  if (Number(booking.balanceAmount || 0) > 0) {
    return `${formatNaira(Number(booking.balanceAmount || 0) / 100)} of ${total}`;
  }
  return total;
}

function buyerName(order: OrderRow) {
  const address = order.deliveryAddress && typeof order.deliveryAddress === 'object' ? order.deliveryAddress as Record<string, string> : {};
  const named = `${address.firstName || ''} ${address.lastName || ''}`.trim();
  return named || address.name || 'Customer';
}

function orderLabel(order: OrderRow) {
  const address = order.deliveryAddress && typeof order.deliveryAddress === 'object' ? order.deliveryAddress as Record<string, string> : {};
  const place = address.city || address.state || '';
  return `${buyerName(order)}${place ? ` · ${place}` : ''}`;
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}
