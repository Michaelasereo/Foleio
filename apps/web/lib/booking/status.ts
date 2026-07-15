export type BookingStatusFilter = 'upcoming' | 'disputed' | 'completed';

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  deposit_paid: 'Deposit paid',
  balance_overdue: 'Balance overdue',
  paid: 'Paid',
  first_payout_done: 'Confirmed',
  service_day: 'Service day',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

export const STATUS_FILTER_META: Record<
  BookingStatusFilter,
  { title: string; empty: string; href: string }
> = {
  upcoming: {
    title: 'Upcoming',
    empty: 'No upcoming bookings.',
    href: '/bookings/upcoming',
  },
  disputed: {
    title: 'Disputed',
    empty: 'No disputed bookings.',
    href: '/bookings/disputed',
  },
  completed: {
    title: 'Completed',
    empty: 'No completed bookings yet.',
    href: '/bookings/completed',
  },
};

export const UPCOMING_STATUSES = [
  'deposit_paid',
  'balance_overdue',
  'paid',
  'first_payout_done',
  'service_day',
] as const;
export const COMPLETED_STATUSES = ['completed', 'refunded', 'cancelled'] as const;

export function isBookingStatusFilter(value: string): value is BookingStatusFilter {
  return value === 'upcoming' || value === 'disputed' || value === 'completed';
}

export function bookingMatchesFilter(
  status: string,
  filter: BookingStatusFilter
): boolean {
  if (filter === 'upcoming') return (UPCOMING_STATUSES as readonly string[]).includes(status);
  if (filter === 'disputed') return status === 'disputed';
  return (COMPLETED_STATUSES as readonly string[]).includes(status);
}

export function statusTone(status: string) {
  if (status === 'disputed' || status === 'balance_overdue') return 'is-danger';
  if (status === 'completed') return 'is-success';
  if (status === 'refunded' || status === 'cancelled') return 'is-muted';
  return 'is-info';
}

export function formatBookingPrice(priceInKobo: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(priceInKobo / 100);
}

export function formatBookingDate(
  dateStr: string | Date,
  startTime?: string | null,
  endTime?: string | null
) {
  const datePart = new Date(dateStr).toLocaleDateString('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
  if (startTime && endTime) {
    const fmt = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
    };
    return `${datePart} · ${fmt(startTime)}–${fmt(endTime)}`;
  }
  return datePart;
}

export type CreatorBookingRow = {
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
  firstPayoutAmount?: number;
  secondPayoutAmount?: number;
  status: string;
  notes: string | null;
  disputeReason: string | null;
  disputeStatus: string | null;
  paymentReference?: string | null;
  trackingToken?: string | null;
  createdAt: string;
  updatedAt?: string;
  /** Computed client-side or from load helper */
  balanceDueDateLabel?: string | null;
  priceListItem: {
    name: string;
    category: string | null;
    price: number;
    description?: string | null;
    durationMinutes?: number | null;
  } | null;
};
