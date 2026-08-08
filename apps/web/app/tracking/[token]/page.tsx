'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  Check,
  Circle,
  Clock,
  Loader2,
  Mail,
  User,
} from 'lucide-react';
import { FanSupportChat } from '@/components/ai/FanSupportChat';
import { FoleioStatusPage } from '@/components/system/FoleioStatusPage';
import { authCss } from '@/components/auth/styles';
import { formatBookingWhen } from '@/lib/booking/slots';
import { BOOKING_STATUS_LABELS } from '@/lib/booking/status';
import foleioLogo from '../../../../../foleio-logo.png';

interface BookingData {
  id: string;
  status: string;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  startTime?: string | null;
  endTime?: string | null;
  totalAmount: number;
  depositAmount?: number;
  balanceAmount?: number;
  amountPaid?: number;
  paymentPlan?: string;
  balanceDueDate?: string | null;
  balanceDueDateLabel?: string | null;
  notes: string | null;
  disputeReason: string | null;
  disputeStatus: string | null;
  selectedLocation?: { id: string; name: string; price: number } | null;
  selectedAddons?: Array<{ id: string; name: string; price: number }> | null;
  priceListItem: {
    name: string;
    category: string | null;
    description: string | null;
  };
  creator: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
    category: string;
  };
  progress: {
    step: number;
    steps: {
      name: string;
      status: 'completed' | 'current' | 'upcoming';
      description: string;
    }[];
  };
}

const trackingCss = `
${authCss}

body:has(.foleio-track-root) footer:not(.foleio-auth-legal) {
  display: none !important;
}

.foleio-track-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 32px 20px 48px;
  box-sizing: border-box;
}

.foleio-track-brand {
  display: inline-flex;
  align-items: center;
  margin-bottom: 28px;
}

.foleio-track-brand img {
  height: 32px;
  width: auto;
  filter: brightness(0) invert(1);
}

.foleio-track-card {
  width: 100%;
  max-width: 460px;
  background: #212121;
  border-radius: 12px;
  padding: 28px 24px;
}

.foleio-track-title {
  margin: 0;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: clamp(1.5rem, 3vw, 1.85rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.15;
  text-align: center;
}

.foleio-track-desc {
  margin: 10px 0 0;
  color: #adadad;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  text-align: center;
}

.foleio-track-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 16px auto 0;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #f4f4f5;
  font-size: 12px;
  font-weight: 500;
}

.foleio-track-status.is-danger {
  background: rgba(252, 165, 165, 0.12);
  color: #fca5a5;
}

.foleio-track-status.is-ok {
  background: rgba(134, 239, 172, 0.12);
  color: #86efac;
}

.foleio-track-status.is-muted {
  background: rgba(255, 255, 255, 0.06);
  color: #adadad;
}

.foleio-track-field {
  display: grid;
  gap: 8px;
  margin-top: 20px;
  text-align: left;
}

.foleio-track-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  border-radius: 10px;
  background: #1a1816;
}

.foleio-track-input-wrap svg {
  color: #adadad;
  flex-shrink: 0;
}

.foleio-track-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  background: transparent;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: 15px;
  font-weight: 500;
  outline: none;
}

.foleio-track-input::placeholder {
  color: #5c6070;
}

.foleio-track-error {
  margin: 10px 0 0;
  color: #fca5a5;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
}

.foleio-track-btn,
.foleio-track-btn-outline,
.foleio-track-btn-ghost,
.foleio-track-btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  border-radius: 9px;
  font-family: var(--font-body), sans-serif;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.foleio-track-btn:hover,
.foleio-track-btn-outline:hover,
.foleio-track-btn-ghost:hover,
.foleio-track-btn-danger:hover {
  opacity: 0.92;
}

.foleio-track-btn:disabled,
.foleio-track-btn-outline:disabled,
.foleio-track-btn-ghost:disabled,
.foleio-track-btn-danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.foleio-track-btn {
  border: 1px solid #ffffff;
  background: #ffffff;
  color: #001035;
}

.foleio-track-btn-outline {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: #f4f4f5;
}

.foleio-track-btn-ghost {
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.06);
  color: #adadad;
}

.foleio-track-btn-danger {
  border: 1px solid rgba(252, 165, 165, 0.35);
  background: rgba(252, 165, 165, 0.12);
  color: #fca5a5;
}

.foleio-track-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.foleio-track-hint {
  margin: 8px 0 0;
  color: #828282;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
}

.foleio-track-section {
  margin-top: 20px;
  text-align: left;
}

.foleio-track-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background: rgba(252, 165, 165, 0.1);
  color: #fca5a5;
}

.foleio-track-alert p {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  color: #f4f4f5;
}

.foleio-track-alert span {
  display: block;
  margin-top: 6px;
  color: #adadad;
  font-size: 12px;
}

.foleio-track-steps {
  display: grid;
  gap: 0;
  position: relative;
}

.foleio-track-step {
  display: flex;
  gap: 12px;
  padding-bottom: 18px;
  position: relative;
}

.foleio-track-step:last-child {
  padding-bottom: 0;
}

.foleio-track-step-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 28px;
  flex-shrink: 0;
}

.foleio-track-step-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #2b2b2b;
  color: #828282;
  flex-shrink: 0;
}

.foleio-track-step-dot.is-done {
  background: rgba(134, 239, 172, 0.12);
  color: #86efac;
}

.foleio-track-step-dot.is-current {
  background: rgba(255, 255, 255, 0.12);
  color: #fafafa;
}

.foleio-track-step-line {
  width: 2px;
  flex: 1;
  min-height: 18px;
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.08);
}

.foleio-track-step-line.is-done {
  background: rgba(134, 239, 172, 0.35);
}

.foleio-track-step-copy h4 {
  margin: 2px 0 0;
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.foleio-track-step-copy h4.is-muted {
  color: #828282;
}

.foleio-track-step-copy p {
  margin: 4px 0 0;
  color: #adadad;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

.foleio-track-creator {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.foleio-track-avatar {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: #2b2b2b;
  color: #adadad;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.foleio-track-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.foleio-track-creator-name {
  margin: 0;
  color: #f4f4f5;
  font-size: 15px;
  font-weight: 600;
}

.foleio-track-creator-meta {
  margin: 2px 0 0;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
}

.foleio-track-receipt {
  background: #1a1816;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.foleio-track-receipt-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.foleio-track-receipt-label {
  color: #828282;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.foleio-track-receipt-value {
  color: #f4f4f5;
  font-size: 13px;
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}

.foleio-track-receipt-value.is-strong {
  font-size: 15px;
  font-weight: 600;
}

.foleio-track-receipt-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 2px 0;
}

.foleio-track-link {
  display: inline-block;
  margin-top: 14px;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  text-align: center;
  width: 100%;
}

.foleio-track-link:hover {
  color: #fafafa;
}

.foleio-track-footer {
  margin-top: 28px;
  text-align: center;
}

.foleio-track-footer a {
  color: #828282;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
}

.foleio-track-footer a:hover {
  color: #adadad;
}

.foleio-track-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.foleio-track-modal {
  width: 100%;
  max-width: 420px;
  background: #212121;
  border-radius: 12px;
  padding: 24px;
}

.foleio-track-modal h2 {
  margin: 0;
  color: #f4f4f5;
  font-size: 18px;
  font-weight: 600;
}

.foleio-track-modal p {
  margin: 8px 0 0;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
}

.foleio-track-textarea {
  width: 100%;
  margin-top: 16px;
  min-height: 110px;
  padding: 12px 14px;
  border: none;
  border-radius: 10px;
  background: #1a1816;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  resize: vertical;
  outline: none;
}

.foleio-track-textarea::placeholder {
  color: #5c6070;
}

.foleio-track-modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.foleio-track-modal-actions .foleio-track-btn-outline,
.foleio-track-modal-actions .foleio-track-btn-danger {
  flex: 1;
}
`;

function formatPrice(priceInKobo: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(priceInKobo / 100);
}

function statusBadgeClass(status: string) {
  if (status === 'disputed' || status === 'balance_overdue') return 'is-danger';
  if (status === 'completed') return 'is-ok';
  if (status === 'refunded' || status === 'cancelled') return 'is-muted';
  return '';
}

function TrackingBrand() {
  return (
    <Link href="/" className="foleio-track-brand" aria-label="Foleio home">
      <Image
        src={foleioLogo}
        alt="Foleio"
        height={32}
        className="h-8 w-auto"
        style={{ filter: 'brightness(0) invert(1)' }}
        priority
      />
    </Link>
  );
}

function TrackingFooter() {
  return (
    <div className="foleio-track-footer">
      <Link href="/signup">Are you a creator? Start on Foleio</Link>
    </div>
  );
}

export default function TrackingPage() {
  const params = useParams();
  const token = params.token as string;

  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);
  const [isPayingBalance, setIsPayingBalance] = useState(false);
  const [isPayingInitial, setIsPayingInitial] = useState(false);

  useEffect(() => {
    void loadPreview();
  }, [token]);

  // After Paystack hosted checkout redirect, verify payment and restore session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const paymentRef = url.searchParams.get('reference') || url.searchParams.get('trxref');
    if (!paymentRef) return;

    const balanceKey = `foleio_balance_pay_${token}`;
    const initialKey = `foleio_initial_pay_${token}`;
    let stashed: { email?: string; bookingId?: string } | null = null;
    let paymentKind: 'balance' | 'initial' = 'balance';
    try {
      const balanceRaw = sessionStorage.getItem(balanceKey);
      const initialRaw = sessionStorage.getItem(initialKey);
      if (balanceRaw) {
        stashed = JSON.parse(balanceRaw) as { email?: string; bookingId?: string };
        paymentKind = 'balance';
        sessionStorage.removeItem(balanceKey);
      } else if (initialRaw) {
        stashed = JSON.parse(initialRaw) as { email?: string; bookingId?: string };
        paymentKind = 'initial';
        sessionStorage.removeItem(initialKey);
      }
    } catch {
      // ignore
    }

    url.searchParams.delete('reference');
    url.searchParams.delete('trxref');
    window.history.replaceState({}, '', url.pathname);

    void (async () => {
      try {
        await fetch('/api/bookings/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: paymentRef,
            bookingId: stashed?.bookingId,
            paymentKind,
          }),
        });
      } catch {
        // Webhook may still settle; continue to reload booking
      }

      const restoreEmail = stashed?.email?.trim();
      if (!restoreEmail) return;

      setEmail(restoreEmail);
      try {
        const response = await fetch(`/api/tracking/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: restoreEmail }),
        });
        const data = await response.json();
        if (response.ok) {
          setBooking(data.data);
          setIsVerified(true);
        }
      } catch {
        // User can re-verify with email
      }
    })();
  }, [token]);

  async function loadPreview() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tracking/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Booking not found');
      }
    } catch {
      setError('Failed to load booking');
    }
    setIsLoading(false);
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch(`/api/tracking/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed');
      } else {
        setBooking(data.data);
        setIsVerified(true);
      }
    } catch {
      setError('Verification failed. Please try again.');
    }
    setIsVerifying(false);
  }

  async function reloadBooking() {
    const response = await fetch(`/api/tracking/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (response.ok) {
      setBooking(data.data);
    }
  }

  async function handleRefundRequest() {
    if (!refundReason.trim()) return;

    setIsRequestingRefund(true);
    try {
      const response = await fetch('/api/bookings/refund-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingToken: token,
          email,
          reason: refundReason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRefundDialogOpen(false);
        setRefundReason('');
        await reloadBooking();
      } else {
        setError(data.error || 'Failed to submit refund request');
      }
    } catch {
      setError('Failed to submit refund request');
    }
    setIsRequestingRefund(false);
  }

  if (isLoading) {
    return (
      <>
        <FoleioStatusPage
          title="Loading booking"
          description="Fetching your booking details…"
          icon={<Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.5} />}
        />
        <FanSupportChat />
      </>
    );
  }

  if (error && !isVerified) {
    return (
      <>
        <FoleioStatusPage
          title="Booking not found"
          description={error}
          icon={<AlertCircle className="h-6 w-6" strokeWidth={1.5} />}
          iconTone="err"
          primaryAction={{ label: 'Go home', href: '/' }}
          secondaryAction={{
            label: 'Become a creator',
            href: '/signup',
            variant: 'outline',
          }}
        />
        <FanSupportChat />
      </>
    );
  }

  if (!isVerified) {
    return (
      <>
        <div className="foleio-auth-root foleio-track-root">
          <style dangerouslySetInnerHTML={{ __html: trackingCss }} />
          <TrackingBrand />
          <div className="foleio-track-card">
            <h1 className="foleio-track-title">Track your booking</h1>
            <p className="foleio-track-desc">
              Enter the email you used when you booked.
            </p>
            <form onSubmit={handleVerify}>
              <div className="foleio-track-field">
                <label className="foleio-auth-label" htmlFor="tracking-email">
                  Email
                </label>
                <div className="foleio-track-input-wrap">
                  <Mail className="h-4 w-4" strokeWidth={1.5} />
                  <input
                    id="tracking-email"
                    className="foleio-track-input"
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              {error ? <p className="foleio-track-error">{error}</p> : null}
              <div className="foleio-track-actions">
                <button
                  type="submit"
                  className="foleio-track-btn"
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  ) : null}
                  {isVerifying ? 'Verifying…' : 'View booking'}
                </button>
              </div>
            </form>
          </div>
          <TrackingFooter />
        </div>
        <FanSupportChat />
      </>
    );
  }

  if (!booking) return null;

  const statusLabel =
    BOOKING_STATUS_LABELS[booking.status] || booking.status.replace(/_/g, ' ');
  const showProgress =
    Boolean(booking.progress) &&
    !['disputed', 'refunded', 'cancelled'].includes(booking.status);
  const showBalancePay =
    ['deposit_paid', 'balance_overdue'].includes(booking.status) &&
    Boolean(booking.balanceAmount);
  const showInitialPay = booking.status === 'pending';
  const showRefund =
    ['deposit_paid', 'balance_overdue', 'paid', 'first_payout_done', 'service_day'].includes(
      booking.status
    );

  return (
    <>
      <div className="foleio-auth-root foleio-track-root">
        <style dangerouslySetInnerHTML={{ __html: trackingCss }} />
        <TrackingBrand />
        <div className="foleio-track-card">
          <h1 className="foleio-track-title">Booking details</h1>
          <p className="foleio-track-desc">Track your booking with {booking.creator.displayName}</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span className={`foleio-track-status ${statusBadgeClass(booking.status)}`}>
              {statusLabel}
            </span>
          </div>

          {booking.status === 'disputed' ? (
            <div className="foleio-track-section">
              <div className="foleio-track-alert">
                <AlertCircle className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                <div>
                  <p>Refund requested</p>
                  <span>
                    Your refund request is being reviewed by the creator.
                    {booking.disputeReason
                      ? ` Reason: ${booking.disputeReason}`
                      : ''}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {booking.status === 'balance_overdue' ? (
            <div className="foleio-track-section">
              <div className="foleio-track-alert">
                <AlertCircle className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                <div>
                  <p>Balance overdue</p>
                  <span>
                    Your remaining balance
                    {booking.balanceDueDateLabel
                      ? ` was due by ${booking.balanceDueDateLabel}`
                      : ' is past due'}
                    . Pay now to settle your outstanding invoice.
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {showProgress ? (
            <div className="foleio-track-section">
              <div className="foleio-track-steps">
                {booking.progress.steps.map((step, index) => {
                  const isLast = index === booking.progress.steps.length - 1;
                  return (
                    <div key={`${step.name}-${index}`} className="foleio-track-step">
                      <div className="foleio-track-step-rail">
                        <div
                          className={`foleio-track-step-dot${
                            step.status === 'completed'
                              ? ' is-done'
                              : step.status === 'current'
                                ? ' is-current'
                                : ''
                          }`}
                        >
                          {step.status === 'completed' ? (
                            <Check className="h-3.5 w-3.5" strokeWidth={2} />
                          ) : step.status === 'current' ? (
                            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                          ) : (
                            <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />
                          )}
                        </div>
                        {!isLast ? (
                          <div
                            className={`foleio-track-step-line${
                              step.status === 'completed' ? ' is-done' : ''
                            }`}
                          />
                        ) : null}
                      </div>
                      <div className="foleio-track-step-copy">
                        <h4 className={step.status === 'upcoming' ? 'is-muted' : undefined}>
                          {step.name}
                        </h4>
                        <p>{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="foleio-track-section">
            <div className="foleio-track-receipt" aria-label="Booking information">
              <div className="foleio-track-creator">
                <div className="foleio-track-avatar">
                  {booking.creator.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={booking.creator.avatarUrl}
                      alt={booking.creator.displayName}
                    />
                  ) : (
                    <User className="h-5 w-5" strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <p className="foleio-track-creator-name">
                    {booking.creator.displayName}
                  </p>
                  <p className="foleio-track-creator-meta">
                    @{booking.creator.username}
                  </p>
                </div>
              </div>

              <div className="foleio-track-receipt-row">
                <span className="foleio-track-receipt-label">Service</span>
                <span className="foleio-track-receipt-value is-strong">
                  {booking.priceListItem.name}
                </span>
              </div>
              {booking.priceListItem.category ? (
                <div className="foleio-track-receipt-row">
                  <span className="foleio-track-receipt-label">Category</span>
                  <span className="foleio-track-receipt-value">
                    {booking.priceListItem.category}
                  </span>
                </div>
              ) : null}
              <div className="foleio-track-receipt-row">
                <span className="foleio-track-receipt-label">Date</span>
                <span className="foleio-track-receipt-value">
                  {formatBookingWhen(
                    booking.bookingDate,
                    booking.startTime,
                    booking.endTime
                  )}
                </span>
              </div>
              {booking.selectedLocation?.name ? (
                <div className="foleio-track-receipt-row">
                  <span className="foleio-track-receipt-label">Location</span>
                  <span className="foleio-track-receipt-value">
                    {booking.selectedLocation.name}
                    {booking.selectedLocation.price > 0
                      ? ` (+${formatPrice(booking.selectedLocation.price)})`
                      : ''}
                  </span>
                </div>
              ) : null}
              {Array.isArray(booking.selectedAddons) &&
              booking.selectedAddons.length > 0 ? (
                <div className="foleio-track-receipt-row">
                  <span className="foleio-track-receipt-label">Add-ons</span>
                  <span className="foleio-track-receipt-value">
                    {booking.selectedAddons
                      .map((addon) =>
                        addon.price > 0
                          ? `${addon.name} (+${formatPrice(addon.price)})`
                          : addon.name
                      )
                      .join(', ')}
                  </span>
                </div>
              ) : null}
              <div className="foleio-track-receipt-divider" />
              <div className="foleio-track-receipt-row">
                <span className="foleio-track-receipt-label">
                  {['deposit_paid', 'balance_overdue'].includes(booking.status)
                    ? 'Deposit paid'
                    : 'Amount paid'}
                </span>
                <span className="foleio-track-receipt-value is-strong">
                  {formatPrice(booking.amountPaid ?? booking.totalAmount)}
                </span>
              </div>
              {['deposit_paid', 'balance_overdue'].includes(booking.status) &&
              booking.balanceAmount ? (
                <>
                  <div className="foleio-track-receipt-row">
                    <span className="foleio-track-receipt-label">Balance due</span>
                    <span className="foleio-track-receipt-value">
                      {formatPrice(booking.balanceAmount)}
                    </span>
                  </div>
                  {booking.balanceDueDateLabel ? (
                    <div className="foleio-track-receipt-row">
                      <span className="foleio-track-receipt-label">
                        {booking.status === 'balance_overdue' ? 'Was due by' : 'Due by'}
                      </span>
                      <span className="foleio-track-receipt-value">
                        {booking.balanceDueDateLabel}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : null}
              {booking.notes ? (
                <>
                  <div className="foleio-track-receipt-divider" />
                  <div className="foleio-track-receipt-row">
                    <span className="foleio-track-receipt-label">Notes</span>
                    <span className="foleio-track-receipt-value">{booking.notes}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="foleio-track-actions">
            {showInitialPay ? (
              <button
                type="button"
                className="foleio-track-btn"
                disabled={isPayingInitial}
                onClick={async () => {
                  setIsPayingInitial(true);
                  try {
                    const initRes = await fetch('/api/bookings/initialize-payment', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        bookingId: booking.id,
                        paymentKind: 'initial',
                      }),
                    });
                    const initData = await initRes.json();
                    if (!initRes.ok) {
                      throw new Error(
                        initData.error || 'Could not start payment'
                      );
                    }

                    const authorizationUrl = initData.authorization_url as
                      | string
                      | undefined;
                    if (!authorizationUrl) {
                      throw new Error('Could not start payment');
                    }

                    try {
                      sessionStorage.setItem(
                        `foleio_initial_pay_${token}`,
                        JSON.stringify({
                          email,
                          bookingId: booking.id,
                        })
                      );
                    } catch {
                      // ignore
                    }

                    window.location.href = authorizationUrl;
                  } catch (err) {
                    alert(
                      err instanceof Error
                        ? err.message
                        : 'Could not start payment'
                    );
                    setIsPayingInitial(false);
                    if (
                      err instanceof Error &&
                      /no longer available/i.test(err.message)
                    ) {
                      window.location.reload();
                    }
                  }
                }}
              >
                {isPayingInitial ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : null}
                Complete payment (
                {formatPrice(
                  booking.paymentPlan === 'deposit' && booking.depositAmount
                    ? booking.depositAmount
                    : booking.totalAmount || 0
                )}
                )
              </button>
            ) : null}

            {showBalancePay ? (
              <button
                type="button"
                className="foleio-track-btn"
                disabled={isPayingBalance}
                onClick={async () => {
                  setIsPayingBalance(true);
                  try {
                    const initRes = await fetch('/api/bookings/initialize-payment', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        bookingId: booking.id,
                        paymentKind: 'balance',
                      }),
                    });
                    const initData = await initRes.json();
                    if (!initRes.ok) {
                      throw new Error(
                        initData.error || 'Could not start balance payment'
                      );
                    }

                    const authorizationUrl = initData.authorization_url as
                      | string
                      | undefined;
                    if (!authorizationUrl) {
                      throw new Error('Could not start balance payment');
                    }

                    // Hosted checkout avoids Paystack Popup + Cloudflare challenge
                    // SSL failures common on mobile Safari (ERR_SSL_BAD_RECORD_MAC).
                    try {
                      sessionStorage.setItem(
                        `foleio_balance_pay_${token}`,
                        JSON.stringify({
                          email,
                          bookingId: booking.id,
                        })
                      );
                    } catch {
                      // ignore
                    }

                    window.location.href = authorizationUrl;
                  } catch (err) {
                    alert(
                      err instanceof Error
                        ? err.message
                        : 'Could not start balance payment'
                    );
                    setIsPayingBalance(false);
                  }
                }}
              >
                {isPayingBalance ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : null}
                Pay balance ({formatPrice(booking.balanceAmount || 0)})
              </button>
            ) : null}

            <Link
              href={`/creator/${booking.creator.username}`}
              className="foleio-track-btn-outline"
            >
              View creator profile
            </Link>

            {showRefund ? (
              <>
                <button
                  type="button"
                  className="foleio-track-btn-ghost"
                  onClick={() => setRefundDialogOpen(true)}
                >
                  Request refund
                </button>
                <p className="foleio-track-hint">
                  Only request a refund if the service was not provided as agreed.
                </p>
              </>
            ) : null}
          </div>

          <Link href="/fan/dashboard" className="foleio-track-link">
            View all your bookings →
          </Link>
        </div>
        <TrackingFooter />

        {refundDialogOpen ? (
          <div
            className="foleio-track-modal-backdrop"
            onClick={() => setRefundDialogOpen(false)}
            role="presentation"
          >
            <div
              className="foleio-track-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="refund-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="refund-title">Request refund</h2>
              <p>
                Explain why you&apos;re requesting a refund. The creator will review
                your request.
              </p>
              <textarea
                className="foleio-track-textarea"
                placeholder="Please provide a detailed reason…"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
              />
              <div className="foleio-track-modal-actions">
                <button
                  type="button"
                  className="foleio-track-btn-outline"
                  onClick={() => setRefundDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="foleio-track-btn-danger"
                  onClick={() => void handleRefundRequest()}
                  disabled={!refundReason.trim() || isRequestingRefund}
                >
                  {isRequestingRefund ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  ) : null}
                  {isRequestingRefund ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <FanSupportChat />
    </>
  );
}
