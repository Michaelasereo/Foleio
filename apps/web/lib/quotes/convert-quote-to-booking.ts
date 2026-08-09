/**
 * After Paystack succeeds for a quote deposit/full pay:
 * creates Booking and/or Shop Order via convertPaidQuote.
 */
export {
  convertPaidQuote,
  convertPaidQuoteToBooking,
} from '@/lib/quotes/convert-paid-quote';
