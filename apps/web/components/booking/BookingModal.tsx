'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowLeft,
  Check,
  Download,
  Loader2,
  X,
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface PriceListItem {
  id: string;
  serviceType?: string | null;
  category: string | null;
  name: string;
  description: string | null;
  sessionDescription?: string | null;
  calendlyLink?: string | null;
  price: number;
  durationMinutes: number | null;
  addons?: Array<{ id: string; name: string; price: number }> | null;
  inclusions?: string[] | null;
  coverImageUrl?: string | null;
  depositType?: string | null;
  depositValue?: number | null;
  allowPayInFull?: boolean | null;
}

interface AvailabilityDate {
  id: string;
  date: Date;
  isAvailable: boolean;
  maxBookings: number | null;
  bookingCount?: number;
  isFullyBooked?: boolean;
}

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedService: PriceListItem;
  creatorId: string;
  creatorName: string;
  availableDates: AvailabilityDate[];
  onBack: () => void;
  isPreview?: boolean;
}

const bookingSchema = z.object({
  customerName: z.string().min(2, 'Name is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().min(10, 'Phone number is required (for WhatsApp and calls)'),
  customerAddress: z.string().min(10, 'Address is required for service delivery'),
  bookingDate: z.string().min(1, 'Please select at least one date'),
  notes: z.string().optional(),
});

type BookingInput = z.infer<typeof bookingSchema>;

type Step = 'service' | 'date' | 'details' | 'payment' | 'success';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function availDateKey(value: string | Date) {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ key: string; day: number } | null> = [];

  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ key: toDateKey(new Date(year, month, day)), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const bookingDrawerCss = `
.foleio-book-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.55);
}
.foleio-book-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 81;
  display: flex;
  flex-direction: column;
  width: min(420px, 100vw);
  background: #212121;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.35);
  animation: foleio-book-drawer-in 180ms ease-out;
}
@keyframes foleio-book-drawer-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.foleio-book-drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 0;
  flex-shrink: 0;
}
.foleio-book-drawer-title {
  margin: 0;
  color: #f4f4f5;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}
.foleio-book-drawer-meta {
  margin: 6px 0 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}
.foleio-book-drawer-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #adadad;
  cursor: pointer;
}
.foleio-book-drawer-close:hover { color: #f4f4f5; }
.foleio-book-drawer-close svg { width: 18px; height: 18px; }
.foleio-book-drawer-body {
  flex: 1;
  overflow: auto;
  padding: 16px 20px 24px;
}
.foleio-book-drawer-footer {
  flex-shrink: 0;
  padding: 16px 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.foleio-book-drawer-actions {
  display: flex;
  gap: 8px;
}
.foleio-book-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.foleio-book-btn.is-ghost {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: #f4f4f5;
}
.foleio-book-btn.is-primary {
  flex: 1;
  border: 1px solid #fff;
  background: #fff;
  color: #001035;
}
.foleio-book-btn:hover { opacity: 0.92; }
.foleio-book-btn:disabled {
  opacity: 0.45;
  pointer-events: none;
}
.foleio-book-progress {
  margin-top: 12px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.foleio-book-progress i {
  display: block;
  height: 100%;
  background: #fff;
}
.foleio-book-panel {
  padding: 12px 14px;
  border-radius: 10px;
  background: #1a1816;
}
.foleio-book-summary-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
}
.foleio-book-summary-row strong {
  color: #f4f4f5;
  font-size: 15px;
  font-weight: 600;
}
.foleio-book-option-name {
  margin: 0;
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 500;
}
.foleio-book-option-price {
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}
.foleio-book-option-desc {
  margin: 6px 0 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}
.foleio-book-option-meta {
  margin: 8px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #828282;
  font-size: 12px;
  font-weight: 500;
}
.foleio-book-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.foleio-book-cal {
  margin-bottom: 4px;
  padding: 12px;
  border-radius: 12px;
  background: #1a1816;
}
.foleio-book-cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.foleio-book-cal-month {
  margin: 0;
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 600;
}
.foleio-book-cal-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #2a2a2a;
  color: #f4f4f5;
  cursor: pointer;
}
.foleio-book-cal-nav:hover { background: #333; }
.foleio-book-cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
  color: #828282;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}
.foleio-book-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.foleio-book-cal-pad { min-height: 38px; }
.foleio-book-cal-day {
  min-height: 38px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #5c5c5c;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: not-allowed;
}
.foleio-book-cal-day.is-open {
  background: #2a2a2a;
  color: #f4f4f5;
  cursor: pointer;
}
.foleio-book-cal-day.is-open:hover {
  background: #333;
}
.foleio-book-cal-day.is-today.is-open:not(.is-selected) {
  border-color: rgba(255, 255, 255, 0.22);
}
.foleio-book-cal-day.is-selected {
  background: #fff;
  color: #111;
  cursor: pointer;
}
.foleio-book-cal-day:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.foleio-book-cal-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  color: #828282;
  font-size: 11px;
  font-weight: 500;
}
.foleio-book-cal-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.foleio-book-cal-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #3a3a3a;
}
.foleio-book-cal-dot.is-open { background: #2a2a2a; box-shadow: inset 0 0 0 1px #666; }
.foleio-book-cal-dot.is-selected { background: #fff; }
.foleio-book-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.foleio-book-label {
  color: #adadad !important;
  font-size: 13px !important;
  font-weight: 500 !important;
}
.foleio-book-input,
.foleio-book-textarea {
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 12px 14px;
  border: none;
  border-radius: 10px;
  background: #1a1816;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 500;
  outline: none;
}
.foleio-book-textarea {
  resize: vertical;
  min-height: 72px;
}
.foleio-book-input:focus,
.foleio-book-textarea:focus {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16);
}
.foleio-book-input::placeholder,
.foleio-book-textarea::placeholder {
  color: #5c6070;
}
.foleio-book-center {
  padding: 24px 8px;
  text-align: center;
}
.foleio-book-drawer-empty {
  margin: 24px 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
}
.foleio-book-success-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 999px;
  background: rgba(134, 239, 172, 0.16);
  color: #86efac;
  display: flex;
  align-items: center;
  justify-content: center;
}
.foleio-book-success {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.foleio-book-receipt-capture {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px;
  border-radius: 14px;
  background: #212121;
}
.foleio-book-success-copy {
  text-align: center;
}
.foleio-book-success-copy .foleio-book-option-name {
  margin-bottom: 6px;
}
.foleio-book-receipt {
  background: #1a1816;
  border-radius: 12px;
  padding: 14px 16px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.foleio-book-receipt-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.foleio-book-receipt-label {
  color: #828282;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}
.foleio-book-receipt-value {
  color: #f4f4f5;
  font-size: 13px;
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}
.foleio-book-receipt-value.is-strong {
  font-size: 15px;
  font-weight: 600;
}
.foleio-book-receipt-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 2px 0;
}
.foleio-book-track-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #f4f4f5;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
}
.foleio-book-track-link:hover {
  background: rgba(255, 255, 255, 0.04);
}
`;



export function BookingModal({
  open,
  onOpenChange,
  selectedService,
  creatorId,
  creatorName,
  availableDates,
  onBack,
  isPreview = false,
}: BookingModalProps) {
  const [step, setStep] = useState<Step>('date');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [openDates, setOpenDates] = useState<AvailabilityDate[]>(availableDates);
  const [allowMultipleDates, setAllowMultipleDates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    trackingToken?: string;
    bookingId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    notes?: string;
    bookingDate?: string;
    amount?: number;
    paymentReference?: string;
  } | null>(null);
  const [bookingLimitReached, setBookingLimitReached] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'deposit'>('full');
  const paymentSucceededRef = useRef(false);
  const receiptCaptureRef = useRef<HTMLDivElement | null>(null);

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const openDateKeys = useMemo(() => {
    const set = new Set<string>();
    for (const d of openDates) {
      set.add(availDateKey(d.date));
    }
    return set;
  }, [openDates]);

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const monthCells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const monthLabel = viewMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const form = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      bookingDate: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    setStep('date');
    setSelectedDate(null);
    setSelectedDates([]);
    setAllowMultipleDates(false);
    setBookingLimitReached(false);
    setBookingResult(null);
    setSelectedAddonIds([]);
    setOpenDates(availableDates);
    const keys = availableDates.map((d) => availDateKey(d.date)).sort();
    if (keys.length > 0) {
      const [y, m] = keys[0].split('-').map(Number);
      setViewMonth(new Date(y, m - 1, 1));
    } else {
      const now = new Date();
      setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
    setPaymentPlan(
      selectedService.depositType && selectedService.allowPayInFull === false
        ? 'deposit'
        : selectedService.depositType
          ? 'deposit'
          : 'full'
    );
    paymentSucceededRef.current = false;
    form.reset();
    // Only reset when the drawer opens or the booked service changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedService.id]);

  function removeBookedDateFromCalendar(dateKey: string) {
    setOpenDates((prev) =>
      prev.filter((d) => availDateKey(d.date) !== dateKey)
    );
  }

  function shiftMonth(delta: number) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  const serviceAddons = Array.isArray(selectedService.addons)
    ? selectedService.addons
    : [];
  const addonsTotal = serviceAddons
    .filter((addon) => selectedAddonIds.includes(addon.id))
    .reduce((sum, addon) => sum + Number(addon.price || 0), 0);
  const packageTotal = Number(selectedService.price) + addonsTotal;
  const depositEnabled = Boolean(selectedService.depositType);
  const allowPayInFull = selectedService.allowPayInFull !== false;

  let depositPreview = packageTotal;
  if (depositEnabled && selectedService.depositType === 'percent') {
    const pct = Math.min(100, Math.max(1, Number(selectedService.depositValue) || 0));
    depositPreview = Math.floor((packageTotal * pct) / 100);
  } else if (depositEnabled && selectedService.depositType === 'fixed') {
    depositPreview = Math.min(
      packageTotal,
      Math.max(0, Number(selectedService.depositValue) || 0)
    );
  }
  const chargeNowPreview =
    depositEnabled && paymentPlan === 'deposit' && depositPreview < packageTotal
      ? depositPreview
      : packageTotal;

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]
    );
  }

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const stepProgress = {
    service: 20,
    date: 40,
    details: 60,
    payment: 80,
    success: 100,
  };

  function handleDateSelect(dateStr: string) {
    const dateObj = openDates.find(d => {
      const dStr = new Date(d.date).toISOString().split('T')[0];
      return dStr === dateStr;
    });

    // Check if date is fully booked
    if (dateObj?.isFullyBooked) {
      alert('This date is fully booked. Please select a different date.');
      return;
    }

    // Check if date is in the past
    const selectedDateObj = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDateObj < today) {
      alert('Cannot select a date in the past.');
      return;
    }

    if (allowMultipleDates) {
      // Multiple date selection
      if (selectedDates.includes(dateStr)) {
        setSelectedDates(selectedDates.filter(d => d !== dateStr));
        if (selectedDates.length === 1) {
          form.setValue('bookingDate', '');
        } else {
          form.setValue('bookingDate', selectedDates.filter(d => d !== dateStr).join(','));
        }
      } else {
        const newDates = [...selectedDates, dateStr].sort();
        setSelectedDates(newDates);
        form.setValue('bookingDate', newDates.join(','));
      }
    } else {
      // Single date selection
      setSelectedDate(dateStr);
      setSelectedDates([dateStr]);
      form.setValue('bookingDate', dateStr);
      setStep('details');
    }
  }

  function handleContinueWithDates() {
    if (selectedDates.length === 0) {
      alert('Please select at least one date.');
      return;
    }
    setStep('details');
  }

  async function onSubmit(data: BookingInput) {
    if (isPreview) {
      alert('This is sample preview content. Publish real services to start taking bookings.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Parse dates (support both single and multiple)
      const dateStrings = data.bookingDate.split(',').map(s => s.trim()).filter(Boolean);
      
      if (dateStrings.length === 0) {
        throw new Error('Please select at least one date.');
      }

      // Validate all selected dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const dateStr of dateStrings) {
        const selectedDateObj = new Date(dateStr);
        selectedDateObj.setHours(0, 0, 0, 0);

        // Check if date is in the past
        if (selectedDateObj < today) {
          throw new Error('Cannot book dates in the past. Please select a future date.');
        }

        // Check if date has availability
        const availableDate = openDates.find(d => {
          const dateObj = new Date(d.date);
          dateObj.setHours(0, 0, 0, 0);
          return dateObj.getTime() === selectedDateObj.getTime();
        });

        if (!availableDate) {
          throw new Error(`Date ${formatDate(selectedDateObj)} is not available. Please choose a different date.`);
        }

        if (!availableDate.isAvailable) {
          throw new Error(`Date ${formatDate(selectedDateObj)} is not available.`);
        }

        if (availableDate.isFullyBooked) {
          throw new Error(`Date ${formatDate(selectedDateObj)} is fully booked. Please choose a different date.`);
        }
      }

      // For now, create booking for the first date only (can be extended to support multiple)
      const firstDate = dateStrings[0];

      // Create booking
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          priceListItemId: selectedService.id,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerAddress: data.customerAddress,
          bookingDate: firstDate,
          notes: data.notes,
          paymentPlan: depositEnabled ? paymentPlan : 'full',
          selectedAddonIds,
        }),
      });

      const result = await response.json();

      if (response.status === 403 && result.limitType === 'maxBookingsPerMonth') {
        setBookingLimitReached(true);
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
      }

      setBookingResult({
        trackingToken: result.trackingToken,
        bookingId: result.booking.id,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        notes: data.notes,
        bookingDate: firstDate,
        amount: Number(result.booking.totalAmount ?? selectedService.price),
      });
      
      // Proceed to payment
      setStep('payment');
      removeBookedDateFromCalendar(firstDate);

      // Initialize Paystack payment
      await initializePayment(result.booking, data);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert(error instanceof Error ? error.message : 'Failed to create booking');
    }
    setIsSubmitting(false);
  }

  async function verifyBookingPayment(paymentReference: string, bookingId: string) {
    setIsSubmitting(true);
    try {
      const verifyResponse = await fetch('/api/bookings/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: paymentReference,
          bookingId,
        }),
      });
      const verifyData = await verifyResponse.json().catch(() => ({}));
      if (verifyResponse.ok && verifyData.success) {
        paymentSucceededRef.current = true;
        setBookingResult((prev) => ({
          ...(prev || {}),
          bookingId,
          paymentReference,
          trackingToken:
            verifyData.booking?.trackingToken || prev?.trackingToken,
          amount: Number(
            verifyData.booking?.totalAmount ?? prev?.amount ?? selectedService.price
          ),
          bookingDate:
            verifyData.booking?.bookingDate?.slice?.(0, 10) || prev?.bookingDate,
          customerName: verifyData.booking?.customerName || prev?.customerName,
          customerEmail: verifyData.booking?.customerEmail || prev?.customerEmail,
          customerPhone: verifyData.booking?.customerPhone || prev?.customerPhone,
          customerAddress:
            verifyData.booking?.customerAddress || prev?.customerAddress,
          notes: verifyData.booking?.notes || prev?.notes,
        }));
        setStep('success');
      } else {
        if (!paymentSucceededRef.current) {
          alert(
            `Payment verification failed: ${
              verifyData.error || 'Unknown error'
            }\n\nReference: ${paymentReference}`
          );
          setStep('details');
        }
      }
    } catch (e) {
      console.error('Payment verification error:', e);
      if (!paymentSucceededRef.current) {
        alert(
          `Payment verification error. Reference: ${paymentReference}. Please contact support.`
        );
        setStep('details');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function waitForPaystackPop(timeoutMs = 5000) {
    // @ts-ignore
    if (typeof window.PaystackPop !== 'undefined') return true;
    return new Promise<boolean>((resolve) => {
      const checkPaystack = setInterval(() => {
        // @ts-ignore
        if (typeof window.PaystackPop !== 'undefined') {
          clearInterval(checkPaystack);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkPaystack);
        // @ts-ignore
        resolve(typeof window.PaystackPop !== 'undefined');
      }, timeoutMs);
    });
  }

  async function initializePayment(booking: any, customerData: BookingInput) {
    const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

    // Server-side init with creator subaccount (split payment)
    const initResponse = await fetch('/api/bookings/initialize-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: booking.id, paymentKind: 'initial' }),
    });
    const initData = await initResponse.json().catch(() => ({}));

    if (!initResponse.ok) {
      throw new Error(initData?.error || 'Failed to initialize payment');
    }

    const reference = initData.reference as string;
    const accessCode = initData.access_code as string | undefined;
    const authorizationUrl = initData.authorization_url as string | undefined;
    const amount = Number(initData.amount ?? booking.totalAmount);
    const email = (initData.email as string) || customerData.customerEmail;
    const subaccount = initData.subaccount as string | undefined;
    const publicKey = (initData.publicKey as string) || paystackKey;

    if (!publicKey) {
      // Dev fallback when no public key is configured
      setTimeout(() => {
        void verifyBookingPayment(
          reference || `test_ref_${Date.now()}`,
          booking.id
        );
      }, 1000);
      return;
    }

    const paystackReady = await waitForPaystackPop();

    const onPaymentClose = () => {
      setIsSubmitting(false);
      // Paystack often fires onClose after onSuccess — don't wipe the success screen.
      if (!paymentSucceededRef.current) {
        setStep((current) => (current === 'success' ? current : 'details'));
      }
    };

    // Prefer resumeTransaction(access_code) — charge already includes subaccount split
    if (paystackReady && accessCode) {
      try {
        // @ts-ignore
        const popup = new window.PaystackPop();
        if (typeof popup.resumeTransaction === 'function') {
          popup.resumeTransaction(accessCode, {
            onSuccess: (transaction: { reference?: string }) => {
              void verifyBookingPayment(
                transaction?.reference || reference,
                booking.id
              );
            },
            onCancel: onPaymentClose,
            callback: (response: { reference: string }) => {
              void verifyBookingPayment(response.reference || reference, booking.id);
            },
            onClose: onPaymentClose,
          });
          return;
        }
      } catch (e) {
        console.warn('resumeTransaction unavailable, falling back to setup', e);
      }
    }

    if (!paystackReady) {
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
        return;
      }
      alert('Payment system is not available. Please refresh and try again.');
      setStep('details');
      return;
    }

    // Fallback: Inline setup with server reference + subaccount
    // @ts-ignore
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount,
      currency: 'NGN',
      ref: reference,
      subaccount,
      metadata: {
        type: 'booking',
        bookingId: booking.id,
        paymentType: 'DIRECT_SUBACCOUNT',
        custom_fields: [
          {
            display_name: 'Service',
            variable_name: 'service',
            value: selectedService.name,
          },
        ],
      },
      callback: (response: { reference: string }) => {
        void verifyBookingPayment(response.reference, booking.id);
      },
      onClose: onPaymentClose,
    });

    handler.openIframe();
  }


  function handleClose() {
    onOpenChange(false);
    setBookingLimitReached(false);
    if (step === 'success') {
      setStep('date');
      setSelectedDate(null);
      setSelectedDates([]);
      setAllowMultipleDates(false);
      setBookingResult(null);
      paymentSucceededRef.current = false;
      form.reset();
    }
  }

  async function handleDownloadReceipt() {
    const element = receiptCaptureRef.current;
    if (!element || isDownloadingReceipt) return;

    setIsDownloadingReceipt(true);
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
      const serviceSlug = selectedService.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      link.download = `foleio-booking-${serviceSlug || 'receipt'}-${stamp}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error('Receipt download failed:', error);
      alert('Could not download receipt. Please try again.');
    } finally {
      setIsDownloadingReceipt(false);
    }
  }

  if (!open) return null;

  const title =
    step === 'success'
      ? 'Booking confirmed'
      : step === 'payment'
        ? 'Payment'
        : step === 'details'
          ? 'Your details'
          : 'Select a date';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: bookingDrawerCss }} />
      <div
        className="foleio-book-drawer-backdrop"
        onClick={handleClose}
        aria-hidden
      />
      <aside
        className="foleio-book-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-drawer-title"
      >
        <div className="foleio-book-drawer-header">
          <div>
            <h2 id="booking-drawer-title" className="foleio-book-drawer-title">
              {title}
            </h2>
            <p className="foleio-book-drawer-meta">
              {selectedService.name} · {formatPrice(selectedService.price)}
              {isPreview ? ' · Preview' : ''}
            </p>
            {step !== 'success' ? (
              <div className="foleio-book-progress" aria-hidden>
                <i style={{ width: `${stepProgress[step]}%` }} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="foleio-book-drawer-close"
            aria-label="Close"
            onClick={handleClose}
          >
            <X strokeWidth={1.75} />
          </button>
        </div>

        <div className="foleio-book-drawer-body">
          {bookingLimitReached ? (
            <div className="foleio-book-center">
              <p className="foleio-book-option-name">Bookings unavailable this month</p>
              <p className="foleio-book-option-desc">
                This creator has reached their booking limit for this month. Please check back
                next month.
              </p>
            </div>
          ) : null}

          {step === 'date' && !bookingLimitReached ? (
            <div>
              <div className="foleio-book-panel" style={{ marginBottom: 14 }}>
                <div className="foleio-book-summary-row">
                  <div>
                    <p className="foleio-book-option-name">{selectedService.name}</p>
                    {selectedService.durationMinutes ? (
                      <p className="foleio-book-option-meta">
                        <Clock strokeWidth={1.75} />
                        {selectedService.durationMinutes} min
                      </p>
                    ) : null}
                  </div>
                  <strong className="foleio-book-option-price">
                    {formatPrice(selectedService.price)}
                  </strong>
                </div>
              </div>

              <div className="foleio-book-toolbar">
                <p className="foleio-book-option-name" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Calendar strokeWidth={1.75} className="h-4 w-4" />
                  Pick a date
                </p>
                <button
                  type="button"
                  className="foleio-book-btn is-ghost"
                  style={{ height: 32, fontSize: 12 }}
                  onClick={() => {
                    setAllowMultipleDates(!allowMultipleDates);
                    if (!allowMultipleDates) {
                      setSelectedDates(selectedDate ? [selectedDate] : []);
                    } else {
                      setSelectedDate(null);
                      setSelectedDates([]);
                      form.setValue('bookingDate', '');
                    }
                  }}
                >
                  {allowMultipleDates ? 'Single date' : 'Multiple dates'}
                </button>
              </div>

              <div className="foleio-book-cal">
                  <div className="foleio-book-cal-header">
                    <button
                      type="button"
                      className="foleio-book-cal-nav"
                      onClick={() => shiftMonth(-1)}
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <h3 className="foleio-book-cal-month">{monthLabel}</h3>
                    <button
                      type="button"
                      className="foleio-book-cal-nav"
                      onClick={() => shiftMonth(1)}
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>

                  <div className="foleio-book-cal-weekdays">
                    {WEEKDAY_LABELS.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>

                  <div className="foleio-book-cal-grid">
                    {monthCells.map((cell, index) => {
                      if (!cell) {
                        return <span key={`pad-${index}`} className="foleio-book-cal-pad" />;
                      }

                      const isOpen = openDateKeys.has(cell.key);
                      const isPast = cell.key < todayKey;
                      const canSelect = isOpen && !isPast;
                      const isSelected = allowMultipleDates
                        ? selectedDates.includes(cell.key)
                        : selectedDate === cell.key;

                      return (
                        <button
                          key={cell.key}
                          type="button"
                          disabled={!canSelect}
                          onClick={() => canSelect && handleDateSelect(cell.key)}
                          className={[
                            'foleio-book-cal-day',
                            canSelect ? 'is-open' : '',
                            isSelected ? 'is-selected' : '',
                            cell.key === todayKey ? 'is-today' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          aria-pressed={isSelected}
                          aria-label={`${cell.key}${canSelect ? ', available' : ', unavailable'}${isSelected ? ', selected' : ''}`}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>

                  <div className="foleio-book-cal-legend">
                    <span>
                      <i className="foleio-book-cal-dot is-open" /> Available
                    </span>
                    <span>
                      <i className="foleio-book-cal-dot is-selected" /> Selected
                    </span>
                    <span>
                      <i className="foleio-book-cal-dot" /> Unavailable
                    </span>
                  </div>
                </div>

              {openDateKeys.size === 0 ? (
                <p className="foleio-book-drawer-empty" style={{ marginTop: 12 }}>
                  No available dates right now.
                </p>
              ) : null}

              {(selectedDate || selectedDates.length > 0) ? (
                <p className="foleio-book-option-meta" style={{ marginTop: 12 }}>
                  Selected:{' '}
                  {selectedDates.length > 0
                    ? selectedDates.map((dateStr) => formatDate(new Date(`${dateStr}T12:00:00`))).join(', ')
                    : selectedDate
                      ? formatDate(new Date(`${selectedDate}T12:00:00`))
                      : ''}
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 'details' && !bookingLimitReached ? (
            <Form {...form}>
              <form id="booking-details-form" onSubmit={form.handleSubmit(onSubmit)} className="foleio-book-form">
                {(selectedDate || selectedDates.length > 0) ? (
                  <div className="foleio-book-panel">
                    <p className="foleio-book-drawer-meta" style={{ margin: 0 }}>
                      Selected date{selectedDates.length > 1 ? 's' : ''}
                    </p>
                    <p className="foleio-book-option-name" style={{ marginTop: 6 }}>
                      {selectedDates.length > 0
                        ? selectedDates.map((dateStr) => formatDate(new Date(dateStr))).join(', ')
                        : selectedDate
                          ? formatDate(new Date(selectedDate))
                          : ''}
                    </p>
                  </div>
                ) : null}

                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="foleio-book-label">Your name</FormLabel>
                      <FormControl>
                        <input className="foleio-book-input" placeholder="Adaobi Okeke" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="foleio-book-label">Email</FormLabel>
                      <FormControl>
                        <input
                          className="foleio-book-input"
                          type="email"
                          placeholder="you@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="foleio-book-label">Phone</FormLabel>
                      <FormControl>
                        <input
                          className="foleio-book-input"
                          type="tel"
                          placeholder="08012345678"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="foleio-book-label">Service address</FormLabel>
                      <FormControl>
                        <textarea
                          className="foleio-book-textarea"
                          rows={3}
                          placeholder="Full address for service delivery"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="foleio-book-label">Notes (optional)</FormLabel>
                      <FormControl>
                        <textarea
                          className="foleio-book-textarea"
                          rows={2}
                          placeholder="Any special requests"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {serviceAddons.length > 0 ? (
                  <div className="foleio-book-panel" style={{ marginBottom: 12 }}>
                    <p className="foleio-book-option-name" style={{ marginBottom: 8 }}>
                      Add-ons
                    </p>
                    {serviceAddons.map((addon) => (
                      <label
                        key={addon.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          marginBottom: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={selectedAddonIds.includes(addon.id)}
                            onChange={() => toggleAddon(addon.id)}
                          />
                          {addon.name}
                        </span>
                        <span>{formatPrice(addon.price)}</span>
                      </label>
                    ))}
                  </div>
                ) : null}

                {depositEnabled ? (
                  <div className="foleio-book-panel" style={{ marginBottom: 12 }}>
                    <p className="foleio-book-option-name" style={{ marginBottom: 8 }}>
                      Payment option
                    </p>
                    <label
                      style={{
                        display: 'flex',
                        gap: 8,
                        marginBottom: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="paymentPlan"
                        checked={paymentPlan === 'deposit'}
                        onChange={() => setPaymentPlan('deposit')}
                      />
                      <span>
                        Pay deposit now ({formatPrice(depositPreview)})
                        {packageTotal > depositPreview
                          ? ` · balance ${formatPrice(packageTotal - depositPreview)} later`
                          : ''}
                      </span>
                    </label>
                    {allowPayInFull ? (
                      <label
                        style={{ display: 'flex', gap: 8, cursor: 'pointer' }}
                      >
                        <input
                          type="radio"
                          name="paymentPlan"
                          checked={paymentPlan === 'full'}
                          onChange={() => setPaymentPlan('full')}
                        />
                        <span>Pay in full ({formatPrice(packageTotal)})</span>
                      </label>
                    ) : null}
                  </div>
                ) : null}

                <div className="foleio-book-panel">
                  <div className="foleio-book-summary-row">
                    <span>Due now</span>
                    <strong>{formatPrice(chargeNowPreview)}</strong>
                  </div>
                  {chargeNowPreview !== packageTotal ? (
                    <div className="foleio-book-summary-row" style={{ marginTop: 6 }}>
                      <span>Package total</span>
                      <span>{formatPrice(packageTotal)}</span>
                    </div>
                  ) : null}
                </div>
              </form>
            </Form>
          ) : null}

          {step === 'payment' && !bookingLimitReached ? (
            <div className="foleio-book-center">
              <Loader2 className="h-8 w-8 animate-spin" style={{ margin: '0 auto 12px', color: '#f4f4f5' }} />
              <p className="foleio-book-option-name">Processing payment…</p>
              <p className="foleio-book-option-desc">
                Complete payment in the popup window. Check your popup blocker if it doesn’t open.
              </p>
            </div>
          ) : null}

          {step === 'success' && bookingResult && !bookingLimitReached ? (
            <div className="foleio-book-success">
              <div ref={receiptCaptureRef} className="foleio-book-receipt-capture">
                <div className="foleio-book-success-copy">
                  <div className="foleio-book-success-icon">
                    <Check className="h-7 w-7" />
                  </div>
                  <p className="foleio-book-option-name">Booking confirmed</p>
                  <p className="foleio-book-option-desc">
                    You’re booked with {creatorName}. Keep this summary for your records.
                  </p>
                </div>

                <div className="foleio-book-receipt" aria-label="Booking details">
                  <div className="foleio-book-receipt-row">
                    <span className="foleio-book-receipt-label">Service</span>
                    <span className="foleio-book-receipt-value is-strong">
                      {selectedService.name}
                    </span>
                  </div>
                  <div className="foleio-book-receipt-row">
                    <span className="foleio-book-receipt-label">Date</span>
                    <span className="foleio-book-receipt-value">
                      {bookingResult.bookingDate
                        ? formatDate(new Date(bookingResult.bookingDate))
                        : selectedDates.length > 0
                          ? selectedDates
                              .map((dateStr) => formatDate(new Date(dateStr)))
                              .join(', ')
                          : selectedDate
                            ? formatDate(new Date(selectedDate))
                            : 'N/A'}
                    </span>
                  </div>
                  <div className="foleio-book-receipt-row">
                    <span className="foleio-book-receipt-label">Amount paid</span>
                    <span className="foleio-book-receipt-value is-strong">
                      {formatPrice(bookingResult.amount ?? selectedService.price)}
                    </span>
                  </div>
                  <div className="foleio-book-receipt-divider" />
                  <div className="foleio-book-receipt-row">
                    <span className="foleio-book-receipt-label">Name</span>
                    <span className="foleio-book-receipt-value">
                      {bookingResult.customerName || '—'}
                    </span>
                  </div>
                  <div className="foleio-book-receipt-row">
                    <span className="foleio-book-receipt-label">Email</span>
                    <span className="foleio-book-receipt-value">
                      {bookingResult.customerEmail || '—'}
                    </span>
                  </div>
                  <div className="foleio-book-receipt-row">
                    <span className="foleio-book-receipt-label">Phone</span>
                    <span className="foleio-book-receipt-value">
                      {bookingResult.customerPhone || '—'}
                    </span>
                  </div>
                  <div className="foleio-book-receipt-row">
                    <span className="foleio-book-receipt-label">Address</span>
                    <span className="foleio-book-receipt-value">
                      {bookingResult.customerAddress || '—'}
                    </span>
                  </div>
                  {bookingResult.notes ? (
                    <div className="foleio-book-receipt-row">
                      <span className="foleio-book-receipt-label">Notes</span>
                      <span className="foleio-book-receipt-value">{bookingResult.notes}</span>
                    </div>
                  ) : null}
                  {bookingResult.paymentReference ? (
                    <>
                      <div className="foleio-book-receipt-divider" />
                      <div className="foleio-book-receipt-row">
                        <span className="foleio-book-receipt-label">Payment ref</span>
                        <span className="foleio-book-receipt-value">
                          {bookingResult.paymentReference}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {bookingResult.trackingToken ? (
                <a
                  className="foleio-book-track-link"
                  href={`/tracking/${bookingResult.trackingToken}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View booking status
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="foleio-book-drawer-footer">
          {bookingLimitReached ? (
            <button type="button" className="foleio-book-btn is-primary" onClick={handleClose}>
              Close
            </button>
          ) : null}

          {step === 'date' && !bookingLimitReached ? (
            <div className="foleio-book-drawer-actions">
              <button type="button" className="foleio-book-btn is-ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
                Services
              </button>
              {allowMultipleDates ? (
                <button
                  type="button"
                  className="foleio-book-btn is-primary"
                  disabled={selectedDates.length === 0}
                  onClick={handleContinueWithDates}
                >
                  Continue ({selectedDates.length})
                </button>
              ) : (
                <button
                  type="button"
                  className="foleio-book-btn is-primary"
                  disabled={!selectedDate}
                  onClick={() => selectedDate && setStep('details')}
                >
                  Continue
                </button>
              )}
            </div>
          ) : null}

          {step === 'details' && !bookingLimitReached ? (
            <div className="foleio-book-drawer-actions">
              <button
                type="button"
                className="foleio-book-btn is-ghost"
                onClick={() => setStep('date')}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                form="booking-details-form"
                className="foleio-book-btn is-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  'Proceed to payment'
                )}
              </button>
            </div>
          ) : null}

          {step === 'payment' && !bookingLimitReached ? (
            <button
              type="button"
              className="foleio-book-btn is-ghost"
              onClick={() => {
                setIsSubmitting(false);
                setStep('details');
              }}
            >
              Cancel payment
            </button>
          ) : null}

          {step === 'success' && !bookingLimitReached ? (
            <div className="foleio-book-drawer-actions">
              <button type="button" className="foleio-book-btn is-ghost" onClick={handleClose}>
                Close
              </button>
              <button
                type="button"
                className="foleio-book-btn is-primary"
                onClick={() => void handleDownloadReceipt()}
                disabled={isDownloadingReceipt}
              >
                {isDownloadingReceipt ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download PNG
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
