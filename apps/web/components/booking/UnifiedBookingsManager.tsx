'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { processRefund, rejectRefund } from '@/lib/actions/booking';
import { AvailabilitySetupForm } from '@/components/booking/AvailabilitySetupForm';
import { BookingsServicesManager } from '@/components/booking/BookingsServicesManager';
import type { ServiceItem } from '@/components/booking/BookingsServicesManager';
import { BookingPolicyDocumentSettings } from '@/components/booking/BookingPolicyDocumentSettings';
import type { BookingPolicyDocument } from '@/lib/actions/booking-policy-document';
import {
  BOOKING_STATUS_LABELS,
  STATUS_FILTER_META,
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
}

export function UnifiedBookingsManager({
  creator,
  upcomingBookings,
  disputedBookings,
  completedBookings,
  availability,
  priceList,
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
  const [statusTab, setStatusTab] = useState<BookingStatusFilter>('upcoming');
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
    const nextView: PrimaryView =
      tabParam === 'availability'
        ? 'availability'
        : tabParam === 'services'
          ? 'services'
          : 'bookings';
    setPrimaryView(nextView);
  }, [tabParam, router]);
  const totalBookings =
    upcomingBookings.length + disputedBookings.length + completedBookings.length;

  const stats = [
    {
      title: 'Total Bookings',
      value: totalBookings.toLocaleString(),
      hint: 'All time',
      icon: CalendarDays,
      onSelect: null as BookingStatusFilter | null,
    },
    {
      title: 'Upcoming',
      value: upcomingBookings.length.toLocaleString(),
      hint: 'Active services',
      icon: CalendarClock,
      onSelect: 'upcoming' as BookingStatusFilter,
    },
    {
      title: 'Completed',
      value: completedBookings.length.toLocaleString(),
      hint: 'Finished bookings',
      icon: CheckCircle2,
      onSelect: 'completed' as BookingStatusFilter,
    },
    {
      title: 'Disputed',
      value: disputedBookings.length.toLocaleString(),
      hint: 'Needs attention',
      icon: AlertTriangle,
      onSelect: 'disputed' as BookingStatusFilter,
    },
  ];

  const statusTabs: Array<{ id: BookingStatusFilter; label: string; count: number }> =
    useMemo(
      () => [
        { id: 'upcoming', label: 'Upcoming', count: upcomingBookings.length },
        { id: 'disputed', label: 'Disputed', count: disputedBookings.length },
        { id: 'completed', label: 'Completed', count: completedBookings.length },
      ],
      [upcomingBookings.length, disputedBookings.length, completedBookings.length]
    );

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

  const renderBookingRow = (booking: Booking, actions?: ReactNode) => (
    <div key={booking.id} className="foleio-dash-booking-row">
      <div className="foleio-dash-booking-main">
        <div className="foleio-dash-booking-top">
          <span className="foleio-dash-sub-name">{booking.customerName}</span>
          <span className={`foleio-dash-badge ${statusTone(booking.status)}`}>
            {BOOKING_STATUS_LABELS[booking.status] || booking.status}
          </span>
        </div>
        <div className="foleio-dash-booking-meta">
          <span className="foleio-dash-sub-badge">
            {booking.priceListItem?.name || 'Service'}
          </span>
          <span className="foleio-dash-sub-date">
            {formatBookingDate(booking.bookingDate, booking.startTime, booking.endTime)}
          </span>
        </div>
        {booking.notes ? (
          <p className="foleio-dash-booking-notes">{booking.notes}</p>
        ) : null}
        {booking.disputeReason ? (
          <div className="foleio-dash-dispute">
            <p className="foleio-dash-dispute-label">Dispute reason</p>
            <p className="foleio-dash-booking-notes">{booking.disputeReason}</p>
          </div>
        ) : null}
        {actions ? (
          <div className="foleio-dash-booking-actions">{actions}</div>
        ) : null}
      </div>
      <div className="foleio-dash-booking-amount">
        {booking.paymentPlan === 'deposit' &&
        booking.balanceAmount &&
        booking.balanceAmount > 0 &&
        ['deposit_paid', 'balance_overdue'].includes(booking.status) ? (
          <div style={{ textAlign: 'right' }}>
            <div>{formatBookingPrice(booking.amountPaid ?? booking.depositAmount ?? 0)}</div>
            <span
              className="foleio-dash-badge is-muted"
              style={{ marginTop: 6, display: 'inline-flex' }}
            >
              Deposit paid
            </span>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: booking.status === 'balance_overdue' ? '#f87171' : '#adadad',
                marginTop: 6,
              }}
            >
              Balance {formatBookingPrice(booking.balanceAmount)}
              {booking.balanceDueDateLabel
                ? ` · due ${booking.balanceDueDateLabel}`
                : ''}
            </div>
            <Link
              href={`/bookings/detail/${booking.id}`}
              className="foleio-dash-booking-details"
            >
              View details
            </Link>
          </div>
        ) : (
          <div style={{ textAlign: 'right' }}>
            <div>{formatBookingPrice(booking.totalAmount)}</div>
            {booking.paymentPlan === 'deposit' &&
            (booking.amountPaid ?? 0) > 0 ? (
              <span
                className="foleio-dash-badge is-muted"
                style={{ marginTop: 6, display: 'inline-flex' }}
              >
                Deposit paid
              </span>
            ) : null}
            <Link
              href={`/bookings/detail/${booking.id}`}
              className="foleio-dash-booking-details"
            >
              View details
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  const emptyCopy: Record<BookingStatusFilter, string> = {
    upcoming: STATUS_FILTER_META.upcoming.empty,
    disputed: STATUS_FILTER_META.disputed.empty,
    completed: STATUS_FILTER_META.completed.empty,
  };

  const listForTab =
    statusTab === 'upcoming'
      ? upcomingBookings
      : statusTab === 'disputed'
        ? disputedBookings
        : completedBookings;

  const previewLimit = statusTab === 'upcoming' ? 2 : 5;
  const previewList = listForTab.slice(0, previewLimit);

  return (
    <div>
      <div className="foleio-dash-header">
        <div>
          <h1 className="foleio-auth-title">Bookings</h1>
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
            Manage bookings, services, and availability
          </p>
        </div>
      </div>

      <div className="foleio-dash-tabs" role="tablist" aria-label="Bookings views">
        <button
          type="button"
          role="tab"
          aria-selected={primaryView === 'bookings'}
          className={`foleio-dash-tab${primaryView === 'bookings' ? ' is-active' : ''}`}
          onClick={() => setView('bookings')}
        >
          Bookings
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={primaryView === 'services'}
          className={`foleio-dash-tab${primaryView === 'services' ? ' is-active' : ''}`}
          onClick={() => setView('services')}
        >
          Services
          <span className="foleio-dash-tab-count">{priceList.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={primaryView === 'availability'}
          className={`foleio-dash-tab${primaryView === 'availability' ? ' is-active' : ''}`}
          onClick={() => setView('availability')}
        >
          Manage availability
        </button>
      </div>

      {primaryView === 'availability' ? (
        <AvailabilitySetupForm
          creatorId={creator.id}
          platformPlan={creator.platformPlan}
          platformSubscriptionActive={creator.platformSubscriptionActive}
          availability={availability as any}
        />
      ) : primaryView === 'services' ? (
        <>
          <BookingsServicesManager
            creatorId={creator.id}
            platformPlan={creator.platformPlan}
            platformSubscriptionActive={creator.platformSubscriptionActive}
            initialPriceList={priceList}
          />
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
        </>
      ) : (
        <>
          <div className="foleio-dash-stats">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const isSelected = stat.onSelect === statusTab;
              const content = (
                <>
                  <div className="foleio-dash-stat-top">
                    <span className="foleio-dash-stat-label">{stat.title}</span>
                    <Icon className="foleio-dash-stat-icon h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <div className="foleio-dash-stat-value">{stat.value}</div>
                  <p className="foleio-dash-stat-change">{stat.hint}</p>
                </>
              );

              if (!stat.onSelect) {
                return (
                  <div key={stat.title} className="foleio-dash-stat">
                    {content}
                  </div>
                );
              }

              return (
                <button
                  key={stat.title}
                  type="button"
                  className={`foleio-dash-stat${isSelected ? ' is-selected' : ''}`}
                  onClick={() => setStatusTab(stat.onSelect!)}
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: isSelected
                      ? '1px solid rgba(250,250,250,0.35)'
                      : '1px solid transparent',
                    width: '100%',
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>

          <div className="foleio-dash-tabs" role="tablist" aria-label="Booking status">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={statusTab === tab.id}
                className={`foleio-dash-tab${statusTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setStatusTab(tab.id)}
              >
                {tab.label}
                <span className="foleio-dash-tab-count">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="foleio-dash-panel">
            <div className="foleio-dash-header" style={{ marginBottom: 8 }}>
              <div>
                <h2 className="foleio-dash-panel-title" style={{ marginBottom: 0 }}>
                  {statusTabs.find((t) => t.id === statusTab)?.label}
                </h2>
                <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
                  {listForTab.length === 0
                    ? 'Nothing here yet'
                    : `${listForTab.length} booking${listForTab.length === 1 ? '' : 's'}${
                        listForTab.length > previewList.length
                          ? ` · showing ${previewList.length}`
                          : ''
                      }`}
                </p>
              </div>
              <Link
                href={STATUS_FILTER_META[statusTab].href}
                className="foleio-dash-btn-outline"
              >
                View more
              </Link>
            </div>
            {previewList.length === 0 ? (
              <p className="foleio-dash-empty">{emptyCopy[statusTab]}</p>
            ) : (
              previewList.map((booking) => {
                if (statusTab === 'upcoming') {
                  return renderBookingRow(booking);
                }

                if (statusTab === 'disputed') {
                  return renderBookingRow(
                    booking,
                    <>
                      <button
                        type="button"
                        className="foleio-dash-btn-outline"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setRefundDialogOpen(true);
                        }}
                        disabled={loading === booking.id}
                      >
                        Process refund
                      </button>
                      <button
                        type="button"
                        className="foleio-dash-btn-ghost"
                        onClick={() => handleRejectRefund(booking.id)}
                        disabled={loading === booking.id}
                      >
                        Reject
                      </button>
                    </>
                  );
                }

                return renderBookingRow(booking);
              })
            )}
          </div>
        </>
      )}

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
