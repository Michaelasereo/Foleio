'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, ArrowLeft, Check, Loader2 } from 'lucide-react';

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

export function BookingModal({
  open,
  onOpenChange,
  selectedService,
  creatorId,
  creatorName,
  availableDates,
  onBack,
}: BookingModalProps) {
  const [step, setStep] = useState<Step>('service');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [allowMultipleDates, setAllowMultipleDates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    trackingToken?: string;
    bookingId?: string;
  } | null>(null);
  const [bookingLimitReached, setBookingLimitReached] = useState(false);

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
    const dateObj = availableDates.find(d => {
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
        const availableDate = availableDates.find(d => {
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
      });
      
      // Proceed to payment
      setStep('payment');

      // Initialize Paystack payment
      await initializePayment(result.booking, data);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert(error instanceof Error ? error.message : 'Failed to create booking');
    }
    setIsSubmitting(false);
  }

  async function initializePayment(booking: any, customerData: BookingInput) {
    // Initialize Paystack popup
    const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    
    console.log('🎯 Initializing payment...');
    console.log('💳 Paystack Public Key:', paystackKey ? 'Found (' + paystackKey.substring(0, 15) + '...)' : 'NOT FOUND');
    console.log('📦 Booking ID:', booking.id);
    console.log('💰 Amount (kobo):', booking.totalAmount);
    console.log('📧 Email:', customerData.customerEmail);
    
    if (!paystackKey) {
      // For development/testing without Paystack
      console.log('⚠️ No Paystack key, simulating payment...');
      
      // Simulate successful payment
      setTimeout(async () => {
        try {
          const verifyResponse = await fetch('/api/bookings/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference: `test_ref_${Date.now()}`,
              bookingId: booking.id,
            }),
          });
          
          if (verifyResponse.ok) {
            setStep('success');
          } else {
            const errorData = await verifyResponse.json();
            console.error('Payment verification failed:', errorData);
            alert('Payment simulation failed: ' + (errorData.error || 'Unknown error'));
            setStep('details');
          }
        } catch (e) {
          console.error('Payment verification error:', e);
          alert('Payment simulation failed. Please try again.');
          setStep('details');
        }
      }, 1000);
      return;
    }

    // Check if Paystack script is loaded
    // @ts-ignore
    if (typeof window.PaystackPop === 'undefined') {
      console.log('⏳ Waiting for Paystack script to load...');
      // Wait for script to load
      await new Promise<void>((resolve) => {
        const checkPaystack = setInterval(() => {
          // @ts-ignore
          if (typeof window.PaystackPop !== 'undefined') {
            clearInterval(checkPaystack);
            resolve();
          }
        }, 100);
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkPaystack);
          resolve();
        }, 5000);
      });
    }

    // @ts-ignore
    if (typeof window.PaystackPop === 'undefined') {
      console.error('❌ Paystack script failed to load');
      alert('Payment system is not available. Please refresh the page and try again.');
      setStep('details');
      return;
    }

    console.log('✅ Paystack script loaded, opening payment popup...');

    // @ts-ignore - Paystack is loaded from script
    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email: customerData.customerEmail,
      amount: booking.totalAmount, // already in kobo
      currency: 'NGN',
      ref: `booking_${booking.id}_${Date.now()}`,
      metadata: {
        type: 'booking',
        bookingId: booking.id,
        custom_fields: [
          {
            display_name: 'Service',
            variable_name: 'service',
            value: selectedService.name,
          },
        ],
      },
      callback: async (response: { reference: string }) => {
        console.log('✅ Payment successful! Reference:', response.reference);
        setIsSubmitting(true);
        try {
          const verifyResponse = await fetch('/api/bookings/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference: response.reference,
              bookingId: booking.id,
            }),
          });

          const verifyData = await verifyResponse.json();

          if (verifyResponse.ok && verifyData.success) {
            // Payment verified successfully
            setStep('success');
          } else {
            const errorMessage = verifyData.error || 'Payment verification failed';
            console.error('Payment verification failed:', errorMessage);
            alert(`Payment verification failed: ${errorMessage}\n\nYour payment was successful, but we couldn't verify it automatically. Please contact support with your payment reference: ${response.reference}`);
            setStep('details');
          }
        } catch (e) {
          console.error('Payment verification error:', e);
          alert(`Payment verification error. Your payment was successful (Reference: ${response.reference}), but we couldn't verify it automatically. Please contact support.`);
          setStep('details');
        } finally {
          setIsSubmitting(false);
        }
      },
      onClose: () => {
        console.log('❌ Payment popup closed by user');
        // User closed the payment modal - check if payment was actually made
        // For now, just go back to details
        setIsSubmitting(false);
        setStep('details');
      },
    });

    handler.openIframe();
  }

  function handleClose() {
    if (step === 'success') {
      onOpenChange(false);
      // Reset state
      setStep('service');
      setSelectedDate(null);
      setSelectedDates([]);
      setAllowMultipleDates(false);
      setBookingResult(null);
      setBookingLimitReached(false);
      form.reset();
    } else {
      onOpenChange(false);
      setBookingLimitReached(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {step === 'success' ? 'Booking Confirmed!' : 'Book Service'}
          </DialogTitle>
          <DialogDescription>
            {step === 'success'
              ? `Your booking with ${creatorName} is confirmed`
              : `Complete your booking with ${creatorName}`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        {step !== 'success' && (
          <Progress value={stepProgress[step]} className="h-2 flex-shrink-0" />
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
        {bookingLimitReached ? (
          <div className="py-8 text-center">
            <p className="mb-2 font-semibold text-foreground">
              Bookings unavailable this month
            </p>
            <p className="text-sm text-muted-foreground">
              This creator has reached their booking limit for this month. Please check back next month or contact them directly.
            </p>
          </div>
        ) : null}

        {/* Step: Service Summary */}
        {step === 'service' && !bookingLimitReached && (
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{selectedService.name}</h4>
                  {selectedService.category && (
                    <Badge variant="outline" className="mt-1">
                      {selectedService.category}
                    </Badge>
                  )}
                </div>
                <span className="font-bold text-lg text-primary">
                  {formatPrice(selectedService.price)}
                </span>
              </div>
              {selectedService.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedService.description}
                </p>
              )}
              {selectedService.durationMinutes && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {selectedService.durationMinutes} minutes
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Change Service
              </Button>
              <Button onClick={() => setStep('date')}>
                Select Date
              </Button>
            </div>
          </div>
        )}

        {/* Step: Date Selection */}
        {step === 'date' && !bookingLimitReached && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Select Available Date{allowMultipleDates ? 's' : ''}
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
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
                {allowMultipleDates ? 'Single Date' : 'Multiple Dates'}
              </Button>
            </div>

            {availableDates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No available dates at the moment. Please check back later.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                  {availableDates.map((d) => {
                    const dateStr = new Date(d.date).toISOString().split('T')[0];
                    const isSelected = allowMultipleDates 
                      ? selectedDates.includes(dateStr)
                      : selectedDate === dateStr;
                    const isFullyBooked = d.isFullyBooked || false;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dateObj = new Date(d.date);
                    dateObj.setHours(0, 0, 0, 0);
                    const isPastDate = dateObj < today;
                    const isDisabled = isFullyBooked || isPastDate;

                    return (
                      <button
                        key={d.id}
                        onClick={() => !isDisabled && handleDateSelect(dateStr)}
                        disabled={isDisabled}
                        className={`p-3 rounded-lg border text-left transition-all relative ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed bg-muted border-muted'
                            : isSelected
                            ? 'border-primary bg-primary/10'
                            : 'hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <div className="font-medium">
                          {new Date(d.date).toLocaleDateString('en-NG', {
                            weekday: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(d.date).toLocaleDateString('en-NG', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        {d.maxBookings && (
                          <div className="text-xs mt-1">
                            {d.bookingCount || 0}/{d.maxBookings} booked
                          </div>
                        )}
                        {isFullyBooked && (
                          <div className="absolute top-1 right-1">
                            <Badge variant="destructive" className="text-xs">Full</Badge>
                          </div>
                        )}
                        {isPastDate && (
                          <div className="absolute top-1 right-1">
                            <Badge variant="secondary" className="text-xs">Past</Badge>
                          </div>
                        )}
                        {isSelected && !isDisabled && (
                          <div className="absolute top-1 right-1">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {allowMultipleDates && selectedDates.length > 0 && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Selected Dates ({selectedDates.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDates.map(dateStr => (
                        <Badge key={dateStr} variant="secondary">
                          {formatDate(new Date(dateStr))}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('service')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {allowMultipleDates && (
                <Button 
                  onClick={handleContinueWithDates}
                  disabled={selectedDates.length === 0}
                >
                  Continue ({selectedDates.length} selected)
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step: Customer Details */}
        {step === 'details' && !bookingLimitReached && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              {/* Selected date(s) summary */}
              {(selectedDate || selectedDates.length > 0) && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <span className="text-muted-foreground">Selected Date{selectedDates.length > 1 ? 's' : ''}: </span>
                  <div className="font-medium mt-1">
                    {selectedDates.length > 0 
                      ? selectedDates.map(dateStr => formatDate(new Date(dateStr))).join(', ')
                      : selectedDate 
                      ? formatDate(new Date(selectedDate))
                      : ''}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
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
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="08012345678"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Required for WhatsApp and phone calls
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Address *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter full address for service delivery (e.g., 123 Main Street, Lagos Island, Lagos State)"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Required for service delivery location
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special requests or requirements..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment summary */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Service:</span>
                  <span>{selectedService.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Date:</span>
                  <span>{selectedDate ? formatDate(new Date(selectedDate)) : '-'}</span>
                </div>
                <div className="border-t my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span className="text-primary">
                    {formatPrice(selectedService.price)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  60% ({formatPrice(Math.floor(selectedService.price * 0.6))}) paid to creator immediately.
                  40% paid after service completion.
                </p>
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('date')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Proceed to Payment'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Step: Payment Processing */}
        {step === 'payment' && !bookingLimitReached && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p>Processing your payment...</p>
            <p className="text-sm text-muted-foreground">
              Please complete the payment in the popup window.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              If the payment window doesn't open, please check your popup blocker settings.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setIsSubmitting(false);
                setStep('details');
              }}
              className="mt-4"
            >
              Cancel Payment
            </Button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && bookingResult && !bookingLimitReached && (
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Booking Confirmed!</h3>
              <p className="text-muted-foreground">
                Your booking with {creatorName} has been confirmed.
              </p>
            </div>
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <p>
                <strong>Service:</strong> {selectedService.name}
              </p>
              <p>
                <strong>Date{selectedDates.length > 1 ? 's' : ''}:</strong>{' '}
                {selectedDates.length > 0
                  ? selectedDates.map(dateStr => formatDate(new Date(dateStr))).join(', ')
                  : selectedDate
                  ? formatDate(new Date(selectedDate))
                  : 'N/A'}
              </p>
              <p>
                <strong>Amount Paid:</strong> {formatPrice(selectedService.price)}
              </p>
              {bookingResult?.trackingToken && (
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Tracking Token:</strong> {bookingResult.trackingToken}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              A confirmation email with your tracking link has been sent to your email address.
            </p>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

