'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Check,
  Loader2,
} from 'lucide-react';
import { completeService, processRefund, rejectRefund } from '@/lib/actions/booking';
import {
  UpcomingBookingsCalendar,
  normalizeBookingDate,
} from '@/components/booking/UpcomingBookingsCalendar';
import {
  BOOKING_STATUS_LABELS,
  STATUS_FILTER_META,
  formatBookingDate,
  formatBookingPrice,
  statusTone,
  type BookingStatusFilter,
  type CreatorBookingRow,
} from '@/lib/booking/status';

interface BookingStatusListProps {
  status: BookingStatusFilter;
  bookings: CreatorBookingRow[];
}

export function BookingStatusList({ status, bookings }: BookingStatusListProps) {
  const router = useRouter();
  const meta = STATUS_FILTER_META[status];
  const [loading, setLoading] = useState<string | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<CreatorBookingRow | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const visibleBookings = useMemo(() => {
    if (status !== 'upcoming' || !selectedDate) return bookings;
    return bookings.filter(
      (booking) => normalizeBookingDate(booking.bookingDate) === selectedDate
    );
  }, [bookings, selectedDate, status]);

  const handleCompleteService = async (bookingId: string) => {
    setLoading(bookingId);
    try {
      await completeService(bookingId);
      router.refresh();
    } catch (error) {
      console.error('Error completing service:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleRefundRequest = async () => {
    if (!selectedBooking || !refundReason.trim()) return;
    setLoading(selectedBooking.id);
    try {
      await processRefund(selectedBooking.id);
      setRefundDialogOpen(false);
      setRefundReason('');
      setSelectedBooking(null);
      router.refresh();
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
      router.refresh();
    } catch (error) {
      console.error('Error rejecting refund:', error);
    } finally {
      setLoading(null);
    }
  };

  const renderActions = (booking: CreatorBookingRow): ReactNode => {
    if (status === 'upcoming') {
      if (!['paid', 'first_payout_done'].includes(booking.status)) return null;
      return (
        <button
          type="button"
          className="foleio-dash-btn-primary"
          onClick={() => handleCompleteService(booking.id)}
          disabled={loading === booking.id}
        >
          {loading === booking.id ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          ) : (
            <Check className="h-4 w-4" strokeWidth={1.5} />
          )}
          Complete
        </button>
      );
    }

    if (status === 'disputed') {
      return (
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

    return null;
  };

  return (
    <div>
      <div className="foleio-dash-header">
        <div>
          <Link href="/bookings" className="foleio-dash-btn-ghost" style={{ marginBottom: 12 }}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Back to bookings
          </Link>
          <h1 className="foleio-auth-title">{meta.title} bookings</h1>
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
            {visibleBookings.length === 0
              ? 'Nothing here yet'
              : `${visibleBookings.length} booking${visibleBookings.length === 1 ? '' : 's'}${
                  selectedDate ? ' on selected date' : ''
                }`}
          </p>
        </div>
      </div>

      {status === 'upcoming' ? (
        <UpcomingBookingsCalendar
          bookingDates={bookings.map((booking) => booking.bookingDate)}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      ) : null}

      <div className="foleio-dash-panel">
        {visibleBookings.length === 0 ? (
          <p className="foleio-dash-empty">
            {selectedDate ? 'No upcoming bookings on this date.' : meta.empty}
          </p>
        ) : (
          visibleBookings.map((booking) => (
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
                    {formatBookingDate(
                      booking.bookingDate,
                      booking.startTime,
                      booking.endTime
                    )}
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
                <div className="foleio-dash-booking-actions">
                  <Link
                    href={`/bookings/detail/${booking.id}`}
                    className="foleio-dash-btn-outline"
                  >
                    View details
                  </Link>
                  {renderActions(booking)}
                </div>
              </div>
              <div className="foleio-dash-booking-amount">
                {booking.paymentPlan === 'deposit' &&
                booking.balanceAmount &&
                booking.balanceAmount > 0 &&
                ['deposit_paid', 'balance_overdue'].includes(booking.status) ? (
                  <div style={{ textAlign: 'right' }}>
                    <div>
                      {formatBookingPrice(
                        booking.amountPaid ?? booking.depositAmount ?? 0
                      )}
                    </div>
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
                        color:
                          booking.status === 'balance_overdue'
                            ? '#f87171'
                            : '#adadad',
                        marginTop: 6,
                      }}
                    >
                      Balance {formatBookingPrice(booking.balanceAmount)}
                      {booking.balanceDueDateLabel
                        ? ` · due ${booking.balanceDueDateLabel}`
                        : ''}
                    </div>
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
                  </div>
                )}
              </div>
            </div>
          ))
        )}
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
