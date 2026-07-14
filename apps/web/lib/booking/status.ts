export type BookingStatusFilter = 'upcoming' | 'disputed' | 'completed';

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  deposit_paid: 'Deposit paid',
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
  if (status === 'disputed') return 'is-danger';
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

export function formatBookingDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export type CreatorBookingRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  bookingDate: string;
  totalAmount: number;
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
  priceListItem: {
    name: string;
    category: string | null;
    price: number;
    description?: string | null;
    durationMinutes?: number | null;
  } | null;
};
