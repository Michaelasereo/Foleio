'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  ArrowLeft,
  Download,
  Loader2,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import { cancelBooking } from '@/lib/actions/booking';
import { resendTrackingEmail } from '@/lib/actions/email';
import {
  BOOKING_STATUS_LABELS,
  formatBookingDate,
  formatBookingPrice,
  statusTone,
  type CreatorBookingRow,
} from '@/lib/booking/status';

interface BookingDetailClientProps {
  booking: CreatorBookingRow;
  backHref?: string;
}

export function BookingDetailClient({
  booking,
  backHref = '/bookings',
}: BookingDetailClientProps) {
  const router = useRouter();
  const captureRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isDepositHold = ['deposit_paid', 'balance_overdue'].includes(
    booking.status
  );

  async function handleDownloadPng() {
    const element = captureRef.current;
    if (!element || isDownloading) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#212121',
        logging: false,
      });

      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      const serviceSlug = (booking.priceListItem?.name || 'booking')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      link.download = `foleio-booking-${serviceSlug}-${stamp}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error('Booking download failed:', error);
      alert('Could not download booking details. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleResendTracking() {
    if (!booking.trackingToken) return;
    setActionLoading('resend');
    try {
      const result = await resendTrackingEmail(
        booking.trackingToken,
        booking.customerEmail
      );
      if ('error' in result && result.error) {
        alert(result.error);
      } else {
        alert('Tracking email sent to the customer.');
      }
    } catch (error) {
      console.error(error);
      alert('Could not resend tracking email.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    if (
      !window.confirm(
        'Cancel this booking and release the date? This does not automatically refund the deposit.'
      )
    ) {
      return;
    }
    setActionLoading('cancel');
    try {
      const result = await cancelBooking(booking.id);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
        router.push(backHref);
      }
    } catch (error) {
      console.error(error);
      alert('Could not cancel booking.');
    } finally {
      setActionLoading(null);
    }
  }

  const rows: Array<{ label: string; value: string; strong?: boolean }> = [
    {
      label: 'Service',
      value: booking.priceListItem?.name || 'Service',
      strong: true,
    },
    {
      label: 'Category',
      value: booking.priceListItem?.category || '—',
    },
    {
      label: 'Service date',
      value: formatBookingDate(
        booking.bookingDate,
        booking.startTime,
        booking.endTime
      ),
    },
    {
      label: 'Status',
      value: BOOKING_STATUS_LABELS[booking.status] || booking.status,
    },
  ];

  if (isDepositHold) {
    rows.push({
      label: 'Deposit paid',
      value: formatBookingPrice(
        booking.amountPaid ?? booking.depositAmount ?? 0
      ),
      strong: true,
    });
    if (booking.balanceAmount && booking.balanceAmount > 0) {
      rows.push({
        label: 'Balance remaining',
        value: formatBookingPrice(booking.balanceAmount),
        strong: true,
      });
    }
    if (booking.balanceDueDateLabel) {
      rows.push({
        label: booking.status === 'balance_overdue' ? 'Was due by' : 'Balance due by',
        value: booking.balanceDueDateLabel,
      });
    }
    rows.push({
      label: 'Package total',
      value: formatBookingPrice(booking.totalAmount),
    });
  } else {
    rows.push({
      label: 'Amount paid',
      value: formatBookingPrice(
        booking.amountPaid && booking.amountPaid > 0
          ? booking.amountPaid
          : booking.totalAmount
      ),
      strong: true,
    });
  }

  if (booking.selectedLocation?.name) {
    rows.push({
      label: 'Location',
      value:
        booking.selectedLocation.price > 0
          ? `${booking.selectedLocation.name} (+${formatBookingPrice(booking.selectedLocation.price)})`
          : booking.selectedLocation.name,
    });
  }

  const selectedAddons = Array.isArray(booking.selectedAddons)
    ? booking.selectedAddons
    : [];
  if (selectedAddons.length > 0) {
    rows.push({
      label: 'Add-ons',
      value: selectedAddons
        .map((addon) =>
          addon.price > 0
            ? `${addon.name} (+${formatBookingPrice(addon.price)})`
            : addon.name
        )
        .join(', '),
    });
  }

  rows.push(
    { label: 'Customer', value: booking.customerName },
    { label: 'Email', value: booking.customerEmail || '—' },
    { label: 'Phone', value: booking.customerPhone || '—' },
    { label: 'Address', value: booking.customerAddress || '—' }
  );

  if (booking.notes) {
    rows.push({ label: 'Notes', value: booking.notes });
  }
  if (booking.paymentReference) {
    rows.push({ label: 'Payment ref', value: booking.paymentReference });
  }
  if (booking.disputeReason) {
    rows.push({ label: 'Dispute reason', value: booking.disputeReason });
  }
  if (booking.disputeStatus) {
    rows.push({ label: 'Dispute status', value: booking.disputeStatus });
  }
  if (typeof booking.firstPayoutAmount === 'number') {
    rows.push({
      label: 'First payout',
      value: formatBookingPrice(booking.firstPayoutAmount),
    });
  }
  if (typeof booking.secondPayoutAmount === 'number') {
    rows.push({
      label: 'Second payout',
      value: formatBookingPrice(booking.secondPayoutAmount),
    });
  }
  rows.push({
    label: 'Booked on',
    value: formatBookingDate(booking.createdAt),
  });

  return (
    <div>
      <div className="foleio-dash-header">
        <div>
          <Link href={backHref} className="foleio-dash-btn-ghost" style={{ marginBottom: 12 }}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Back
          </Link>
          <h1 className="foleio-auth-title">Booking details</h1>
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
            {booking.customerName} · {booking.priceListItem?.name || 'Service'}
          </p>
        </div>
        <button
          type="button"
          className="foleio-dash-btn-primary"
          onClick={() => void handleDownloadPng()}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          ) : (
            <Download className="h-4 w-4" strokeWidth={1.5} />
          )}
          {isDownloading ? 'Preparing…' : 'Download PNG'}
        </button>
      </div>

      <div className="foleio-dash-panel">
        <div className="foleio-dash-booking-top" style={{ marginBottom: 16 }}>
          <span className="foleio-dash-sub-name">{booking.customerName}</span>
          <span className={`foleio-dash-badge ${statusTone(booking.status)}`}>
            {BOOKING_STATUS_LABELS[booking.status] || booking.status}
          </span>
        </div>

        <div className="foleio-dash-booking-contacts" style={{ marginBottom: 18 }}>
          <span>
            <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
            {booking.customerEmail}
          </span>
          <span>
            <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
            {booking.customerPhone}
          </span>
          {booking.customerAddress ? (
            <span>
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
              {booking.customerAddress}
            </span>
          ) : null}
        </div>

        <div
          ref={captureRef}
          className="foleio-booking-detail-capture"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: '#212121',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: '#fafafa',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              Booking details
            </p>
            <p style={{ margin: '6px 0 0', color: '#adadad', fontSize: 13 }}>
              {booking.priceListItem?.name || 'Service'} ·{' '}
              {formatBookingDate(
                booking.bookingDate,
                booking.startTime,
                booking.endTime
              )}
            </p>
          </div>

          <div
            style={{
              background: '#1a1816',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {rows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <span style={{ color: '#828282', fontSize: 12, fontWeight: 500 }}>
                  {row.label}
                </span>
                <span
                  style={{
                    color: '#f4f4f5',
                    fontSize: row.strong ? 15 : 13,
                    fontWeight: row.strong ? 600 : 500,
                    textAlign: 'right',
                    maxWidth: '65%',
                    wordBreak: 'break-word',
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {booking.trackingToken ? (
          <p className="foleio-dash-panel-meta" style={{ marginTop: 16, marginBottom: 0 }}>
            Customer tracking link:{' '}
            <Link
              href={`/tracking/${booking.trackingToken}`}
              className="foleio-auth-link"
              target="_blank"
              rel="noreferrer"
            >
              Open tracking page
            </Link>
          </p>
        ) : null}

        {isDepositHold ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 16,
            }}
          >
            {booking.trackingToken ? (
              <button
                type="button"
                className="foleio-dash-btn-outline"
                disabled={actionLoading !== null}
                onClick={() => void handleResendTracking()}
              >
                {actionLoading === 'resend' ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : null}
                Resend tracking link
              </button>
            ) : null}
            <button
              type="button"
              className="foleio-dash-btn-outline"
              disabled={actionLoading !== null}
              onClick={() => void handleCancel()}
              style={{ color: '#f87171' }}
            >
              {actionLoading === 'cancel' ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              ) : null}
              Cancel booking
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
