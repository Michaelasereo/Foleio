'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Calendar, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/demo/EmptyState';
import styles from '@/components/demo/demo-dashboard.module.css';
import { processRefund, rejectRefund } from '@/lib/actions/booking';
import { AvailabilitySetupForm, type AvailabilityDayStatus } from '@/components/booking/AvailabilitySetupForm';
import { BookingsServicesManager } from '@/components/booking/BookingsServicesManager';
import type { ServiceItem } from '@/components/booking/BookingsServicesManager';
import { BookingPolicyDocumentSettings } from '@/components/booking/BookingPolicyDocumentSettings';
import { getBookingPaymentPolicy } from '@/lib/actions/booking-policy';
import type { BookingPolicyDocument } from '@/lib/actions/booking-policy-document';
import {
  BOOKING_STATUS_LABELS,
  formatBookingDate,
  formatBookingPrice,
  statusTone,
  type BookingStatusFilter,
} from '@/lib/booking/status';

interface Creator {
  id: string;
  displayName: string;
  username: string;
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
  bookingPolicyType?: string | null;
  bookingPolicyFileUrl?: string | null;
  bookingPolicyFileName?: string | null;
  bookingPolicyLinkUrl?: string | null;
}

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  bookingDate: string;
  startTime?: string | null;
  endTime?: string | null;
  totalAmount: number;
  paymentPlan?: string;
  depositAmount?: number;
  balanceAmount?: number;
  amountPaid?: number;
  balanceDueDateLabel?: string | null;
  status: string;
  notes: string | null;
  disputeReason: string | null;
  disputeStatus: string | null;
  createdAt: string;
  priceListItem: {
    name: string;
    category: string | null;
    price: number;
  };
}

type PriceListItem = ServiceItem;

type PrimaryView = 'bookings' | 'services' | 'availability';

interface UnifiedBookingsManagerProps {
  creator: Creator;
  upcomingBookings: Booking[];
  disputedBookings: Booking[];
  completedBookings: Booking[];
  availability: Array<{
    id: string;
    date: string;
    isAvailable: boolean;
  }>;
  priceList: PriceListItem[];
  customQuotesEnabled?: boolean;
  fixedBookingsEnabled?: boolean;
}

export function UnifiedBookingsManager({
  creator,
  upcomingBookings,
  disputedBookings,
  completedBookings,
  availability,
  priceList,
  customQuotesEnabled: _customQuotesEnabled = false,
  fixedBookingsEnabled = true,
}: UnifiedBookingsManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialView: PrimaryView =
    tabParam === 'availability'
      ? 'availability'
      : tabParam === 'services'
        ? 'services'
        : 'bookings';

  const [primaryView, setPrimaryView] = useState<PrimaryView>(initialView);
  const [liveAvailability, setLiveAvailability] = useState(availability);
  const [liveServices, setLiveServices] = useState(priceList);
  const onAvailabilityChange = useCallback((days: AvailabilityDayStatus[]) => {
    setLiveAvailability(
      days.map((day) => ({
        id: day.date,
        date: day.date,
        isAvailable: day.isAvailable,
      }))
    );
  }, []);
  const onServicesChange = useCallback((next: ServiceItem[]) => {
    setLiveServices(next);
  }, []);
  const [statusTab, setStatusTab] = useState<BookingStatusFilter>('upcoming');
  const [balanceOnly, setBalanceOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [refundReason, setRefundReason] = useState('');
  useEffect(() => {
    if (tabParam === 'policy') {
      router.replace('/settings?tab=policy');
      return;
    }
    if (tabParam === 'shop') {
      router.replace('/shop');
      return;
    }
    if (tabParam === 'quotes') {
      router.replace('/invoices');
      return;
    }
    const nextView: PrimaryView =
      tabParam === 'availability'
        ? 'availability'
        : tabParam === 'services'
          ? 'services'
          : 'bookings';
    setPrimaryView(nextView);
  }, [tabParam, router]);
  const setView = (view: PrimaryView) => {
    setPrimaryView(view);
    const url =
      view === 'bookings' ? '/bookings' : `/bookings?tab=${view}`;
    router.replace(url, { scroll: false });
  };

  const handleRefundRequest = async () => {
    if (!selectedBooking || !refundReason.trim()) return;
    setLoading(selectedBooking.id);
    try {
      await processRefund(selectedBooking.id);
      setRefundDialogOpen(false);
      setRefundReason('');
      setSelectedBooking(null);
      window.location.reload();
    } catch (error) {
      console.error('Error processing refund:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleRejectRefund = async (bookingId: string) => {
    setLoading(bookingId);
    try {
      await rejectRefund(bookingId);
      window.location.reload();
    } catch (error) {
      console.error('Error rejecting refund:', error);
    } finally {
      setLoading(null);
    }
  };

  const emptyCopy: Record<BookingStatusFilter, { title: string; body: string }> = {
    upcoming: { title: 'No upcoming bookings', body: 'New appointments will show up here.' },
    disputed: { title: 'No disputed bookings', body: 'Disputes will show up here.' },
    completed: { title: 'No completed bookings yet', body: 'Finished appointments will show up here.' },
  };

  const listForTab =
    statusTab === 'upcoming'
      ? upcomingBookings
      : statusTab === 'disputed'
        ? disputedBookings
        : completedBookings;

  const previewList = listForTab;
  const stillToCollect = upcomingBookings.reduce((sum, booking) => {
    if (booking.paymentPlan === 'deposit' && (booking.balanceAmount || 0) > 0) {
      return sum + Number(booking.balanceAmount || 0);
    }
    return sum;
  }, 0);
  const balanceDue = upcomingBookings.filter(
    (booking) => booking.paymentPlan === 'deposit' && Number(booking.balanceAmount || 0) > 0
  );
  const q = query.trim().toLowerCase();
  const visibleBookings = previewList.filter((booking) => {
    if (balanceOnly && !(booking.paymentPlan === 'deposit' && Number(booking.balanceAmount || 0) > 0)) {
      return false;
    }
    if (!q) return true;
    return `${booking.customerName} ${booking.priceListItem?.name || ''}`.toLowerCase().includes(q);
  });
  const paidOnUpcoming = upcomingBookings.reduce(
    (sum, booking) => sum + Number(booking.amountPaid || booking.depositAmount || 0),
    0
  );
  const bookedTotal = upcomingBookings.reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);
  const liveServiceCount = liveServices.filter((item) => item.isActive).length;
  const upcomingCounts = upcomingBookings.reduce<Record<string, number>>((map, booking) => {
    const name = booking.priceListItem?.name;
    if (!name) return map;
    map[name] = (map[name] || 0) + 1;
    return map;
  }, {});
  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-GB', { month: 'long' });
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const monthKey = todayKey.slice(0, 7);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 90);
  const horizonKey = `${horizon.getFullYear()}-${String(horizon.getMonth() + 1).padStart(2, '0')}-${String(horizon.getDate()).padStart(2, '0')}`;
  const openDays = liveAvailability
    .filter((slot) => {
      const key = String(slot.date).slice(0, 10);
      return slot.isAvailable && key >= todayKey && key <= horizonKey;
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 4);
  const openThisMonth = liveAvailability.filter((slot) => {
    const key = String(slot.date).slice(0, 10);
    return slot.isAvailable && key >= todayKey && key.startsWith(monthKey);
  });
  const bookedDates = new Set(upcomingBookings.map((booking) => String(booking.bookingDate).slice(0, 10)));
  const openWithBooking = openThisMonth.filter((slot) => bookedDates.has(String(slot.date).slice(0, 10))).length;
  const pageSubtitle = primaryView === 'services'
    ? `${liveServices.length} service${liveServices.length === 1 ? '' : 's'}. ${liveServiceCount} ${liveServiceCount === 1 ? 'is' : 'are'} on your page for clients to book.`
    : primaryView === 'availability'
      ? `You are open ${openThisMonth.length} more day${openThisMonth.length === 1 ? '' : 's'} in ${monthLabel}.${openWithBooking > 0 ? ` ${openWithBooking} of them ${openWithBooking === 1 ? 'has' : 'have'} a booking.` : ''}`
      : `${upcomingBookings.length} upcoming${stillToCollect > 0 ? `. ${formatBookingPrice(stillToCollect)} still to collect.` : '.'}`;

  return (
    <div className={styles.shell} style={{ display: 'block', minHeight: 0, width: '100%', background: 'transparent' }}>
      <div className={styles.home}>
      <header className={styles.pageHead}>
        <div>
          <h1>Bookings</h1>
          <p>{pageSubtitle}</p>
        </div>
        <div className={styles.headTools}>
        <div className={styles.modeSwitch} role="tablist" aria-label="Bookings views">
          <button type="button" role="tab" aria-selected={primaryView === 'bookings'} onClick={() => setView('bookings')}>
            Bookings
          </button>
          <button type="button" role="tab" aria-selected={primaryView === 'services'} onClick={() => setView('services')}>
            Services
            <span className={styles.tabCount}>{liveServices.length}</span>
          </button>
          {fixedBookingsEnabled ? (
            <button type="button" role="tab" aria-selected={primaryView === 'availability'} onClick={() => setView('availability')}>
              Availability
            </button>
          ) : null}
        </div>
        </div>
      </header>

      {fixedBookingsEnabled ? (
        <div hidden={primaryView !== 'availability'}>
        <AvailabilitySetupForm
          creatorId={creator.id}
          platformPlan={creator.platformPlan}
          platformSubscriptionActive={creator.platformSubscriptionActive}
          availability={availability as any}
          onAvailabilityChange={onAvailabilityChange}
          bookings={upcomingBookings.map((booking) => ({
            bookingDate: booking.bookingDate,
            customerName: booking.customerName,
            startTime: booking.startTime,
            serviceName: booking.priceListItem?.name || null,
          }))}
        />
        </div>
      ) : null}
      <div hidden={primaryView !== 'services'}>
        <div className={styles.svcLayout}>
          <BookingsServicesManager
            creatorId={creator.id}
            platformPlan={creator.platformPlan}
            platformSubscriptionActive={creator.platformSubscriptionActive}
            initialPriceList={priceList}
            onItemsChange={onServicesChange}
            upcomingCounts={upcomingCounts}
            publicPath={creator.username ? `/creator/${creator.username}` : '/dashboard'}
          />
          <aside className={styles.bookSide}>
            <BookingPolicyDocumentSettings
              initial={
                {
                  bookingPolicyType:
                    creator.bookingPolicyType === 'file' ||
                    creator.bookingPolicyType === 'link'
                      ? creator.bookingPolicyType
                      : null,
                  bookingPolicyFileUrl: creator.bookingPolicyFileUrl ?? null,
                  bookingPolicyFileName: creator.bookingPolicyFileName ?? null,
                  bookingPolicyLinkUrl: creator.bookingPolicyLinkUrl ?? null,
                } satisfies BookingPolicyDocument
              }
            />
            <DepositTimingCard />
            {fixedBookingsEnabled ? (
              <section className={styles.softCard}>
                <h2>When clients can book</h2>
                <p className={styles.quiet}>
                  You are open {openThisMonth.length} more day{openThisMonth.length === 1 ? '' : 's'} in {monthLabel}.
                </p>
                <button type="button" className={styles.textLink} onClick={() => setView('availability')}>
                  Edit availability
                  <ArrowRight strokeWidth={1.75} />
                </button>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
      <div hidden={primaryView !== 'bookings'}>
        <div className={styles.bookLayout}>
          <section className={styles.card}>
            <div className={styles.bookTools}>
              <div className={styles.modeSwitch} role="tablist" aria-label="Booking status">
                <button type="button" role="tab" aria-selected={statusTab === 'upcoming' && !balanceOnly} onClick={() => { setBalanceOnly(false); setStatusTab('upcoming'); }}>
                  Upcoming
                  <span className={styles.tabCount}>{upcomingBookings.length}</span>
                </button>
                <button type="button" role="tab" aria-selected={balanceOnly} onClick={() => { setBalanceOnly(true); setStatusTab('upcoming'); }}>
                  Balance due
                  <span className={styles.tabCount}>{balanceDue.length}</span>
                </button>
                <button type="button" role="tab" aria-selected={statusTab === 'disputed'} onClick={() => { setBalanceOnly(false); setStatusTab('disputed'); }}>
                  Disputed
                  <span className={`${styles.tabCount} ${disputedBookings.length > 0 ? styles.tabCountAlert : ''}`}>{disputedBookings.length}</span>
                </button>
                <button type="button" role="tab" aria-selected={statusTab === 'completed'} onClick={() => { setBalanceOnly(false); setStatusTab('completed'); }}>
                  Completed
                  <span className={styles.tabCount}>{completedBookings.length}</span>
                </button>
              </div>
              <input className={styles.bookSearch} value={query} placeholder="Client or service" aria-label="Search clients or services" onChange={(event) => setQuery(event.target.value)} />
            </div>
            {visibleBookings.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={q ? 'No matches' : balanceOnly ? 'No balances due' : emptyCopy[statusTab].title}
                body={
                  q
                    ? 'Try another client or service.'
                    : balanceOnly
                      ? 'Upcoming bookings with a balance will show up here.'
                      : emptyCopy[statusTab].body
                }
              />
            ) : visibleBookings.map((booking) => {
              const when = new Date(booking.bookingDate);
              const tone = booking.status === 'disputed' ? styles.pillAlert : booking.paymentPlan === 'deposit' && Number(booking.balanceAmount || 0) > 0 ? styles.pillWait : styles.pillPaid;
              return (
                <div key={booking.id} className={styles.sched}>
                  <div className={styles.dateBox}>
                    <span>{when.toLocaleDateString('en-GB', { month: 'short' })}</span>
                    <strong>{when.getDate()}</strong>
                  </div>
                  <div className={styles.schedWho}>
                    <strong>{booking.customerName}</strong>
                    <span>{booking.priceListItem?.name || 'Service'} · {formatBookingDate(booking.bookingDate, booking.startTime, booking.endTime)}</span>
                  </div>
                  <div className={styles.schedAmount}>
                    <strong>{formatBookingPrice(booking.totalAmount)}</strong>
                    {Number(booking.balanceAmount || 0) > 0 ? <span>Balance {formatBookingPrice(booking.balanceAmount || 0)}</span> : null}
                  </div>
                  <span className={`${styles.pill} ${tone}`}>{BOOKING_STATUS_LABELS[booking.status] || booking.status}</span>
                  {statusTab === 'disputed' ? (
                    <span style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className={styles.darkButton} onClick={() => { setSelectedBooking(booking); setRefundDialogOpen(true); }} disabled={loading === booking.id}>Refund</button>
                      <button type="button" className={styles.textLink} onClick={() => handleRejectRefund(booking.id)} disabled={loading === booking.id}>Reject</button>
                    </span>
                  ) : (
                    <Link href={`/bookings/detail/${booking.id}`} className={styles.schedArrow} aria-label="View booking">
                      <ArrowRight strokeWidth={1.75} />
                    </Link>
                  )}
                </div>
              );
            })}
          </section>
          <aside className={styles.bookSide}>
            <section className={styles.collectCard}>
              <p className={styles.eyebrow}>Paid on upcoming bookings</p>
              <p className={styles.big}>{formatBookingPrice(paidOnUpcoming)}</p>
              <p className={styles.quiet}>of {formatBookingPrice(bookedTotal)} booked</p>
              <div className={styles.track} aria-hidden="true">
                <span style={{ width: bookedTotal > 0 ? `${Math.min(100, Math.round((paidOnUpcoming / bookedTotal) * 100))}%` : '0%' }} />
              </div>
              <div className={styles.collectRow}>
                <div>
                  <strong>Still to collect</strong>
                  <span>{balanceDue.length === 0 ? 'No deposit balances are waiting.' : balanceDue.slice(0, 2).map((booking) => booking.customerName).join(', ')}</span>
                </div>
                <b>{formatBookingPrice(stillToCollect)}</b>
              </div>
            </section>
            {disputedBookings[0] ? (
              <section className={styles.card}>
                <p className={styles.disputeLabel}>
                  <span className={styles.pillAlert}>{disputedBookings.length}</span>
                  {disputedBookings.length} disputed booking{disputedBookings.length === 1 ? '' : 's'}
                </p>
                <h2 className={styles.sideTitle}>{disputedBookings[0].customerName} · {disputedBookings[0].priceListItem?.name || 'Service'}</h2>
                <p className={styles.quiet}>{formatBookingPrice(disputedBookings[0].totalAmount)} paid</p>
                <p className={styles.sideCopy}>{disputedBookings[0].disputeReason || 'A client asked for a refund.'}</p>
                <button type="button" className={styles.darkButton} onClick={() => { setBalanceOnly(false); setStatusTab('disputed'); }}>Review dispute</button>
              </section>
            ) : null}
            {fixedBookingsEnabled ? (
              <section className={styles.card}>
                <h2 className={styles.sideTitle}>Open days</h2>
                <p className={styles.quiet}>{openDays.length === 0 ? 'No open days in the next 90 days.' : 'Clients can still book these from your link.'}</p>
                <div className={styles.openDays}>
                  {openDays.map((slot) => (
                    <span key={slot.id} className={`${styles.pill} ${styles.pillWait}`}>
                      {new Date(slot.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  ))}
                </div>
                <button type="button" className={styles.textLink} onClick={() => setView('availability')}>
                  Edit availability
                  <ArrowRight strokeWidth={1.75} />
                </button>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
      </div>

      {refundDialogOpen ? (
        <div className="foleio-dash-modal-backdrop" role="presentation">
          <div
            className="foleio-dash-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-title"
          >
            <h2 id="refund-title" className="foleio-dash-panel-title">
              Process refund
            </h2>
            <p className="foleio-dash-panel-meta">
              Refund for {selectedBooking?.customerName}&apos;s booking
            </p>
            <label className="foleio-dash-stat-label" htmlFor="refund-reason">
              Refund reason
            </label>
            <textarea
              id="refund-reason"
              className="foleio-dash-textarea"
              rows={4}
              placeholder="Explain why this refund is being processed..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
            <div className="foleio-dash-booking-actions" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="foleio-dash-btn-ghost"
                onClick={() => {
                  setRefundDialogOpen(false);
                  setRefundReason('');
                  setSelectedBooking(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="foleio-dash-btn-danger"
                onClick={handleRefundRequest}
                disabled={!refundReason.trim() || loading === selectedBooking?.id}
              >
                {loading === selectedBooking?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    Processing...
                  </>
                ) : (
                  'Process refund'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DepositTimingCard() {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    void getBookingPaymentPolicy().then((result) => {
      if (!mounted || !result.success || !result.data) return;
      setDays(result.data.balanceDueDaysBefore);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className={styles.softCard}>
      <h2>When a client pays a deposit</h2>
      <div className={styles.statRow}>
        <span>Balance is due</span>
        <strong>{days == null ? '—' : `${days} day${days === 1 ? '' : 's'} before`}</strong>
      </div>
      <div className={styles.statRow}>
        <span>Reminder emails</span>
        <strong>2 days before, and on the day</strong>
      </div>
      <Link href="/settings?tab=policy" className={styles.textLink}>
        Change when balances are due
        <ArrowRight strokeWidth={1.75} />
      </Link>
    </section>
  );
}
