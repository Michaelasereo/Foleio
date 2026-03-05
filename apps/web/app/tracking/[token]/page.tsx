'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Check,
  Circle,
  Clock,
  Mail,
  Calendar,
  User,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface BookingData {
  id: string;
  status: string;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  totalAmount: number;
  notes: string | null;
  disputeReason: string | null;
  disputeStatus: string | null;
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

export default function TrackingPage() {
  const params = useParams();
  const token = params.token as string;

  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refund dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);

  // Load preview on mount
  useEffect(() => {
    loadPreview();
  }, [token]);

  async function loadPreview() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tracking/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Booking not found');
      }
    } catch (e) {
      setError('Failed to load booking');
    }
    setIsLoading(false);
  }

  async function handleVerify(e: React.FormEvent) {
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
    } catch (e) {
      setError('Verification failed. Please try again.');
    }
    setIsVerifying(false);
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
        // Reload booking to show updated status
        await handleVerify({ preventDefault: () => {} } as React.FormEvent);
      } else {
        setError(data.error || 'Failed to submit refund request');
      }
    } catch (e) {
      setError('Failed to submit refund request');
    }
    setIsRequestingRefund(false);
  }

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pending Payment', variant: 'outline' },
      paid: { label: 'Paid', variant: 'default' },
      first_payout_done: { label: 'Confirmed', variant: 'default' },
      service_day: { label: 'Service Day', variant: 'default' },
      completed: { label: 'Completed', variant: 'default' },
      disputed: { label: 'Disputed', variant: 'destructive' },
      refunded: { label: 'Refunded', variant: 'secondary' },
      cancelled: { label: 'Cancelled', variant: 'secondary' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email verification form
  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Track Your Booking</CardTitle>
            <CardDescription>
              Enter the email address you used to make this booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'View Booking'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Booking details view
  if (!booking) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Booking Details</h1>
          <p className="text-muted-foreground">Track your booking status</p>
          <a href="/fan/dashboard" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
            View all your bookings →
          </a>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          {getStatusBadge(booking.status)}
        </div>

        {/* Progress Steps */}
        {booking.progress && !['disputed', 'refunded', 'cancelled'].includes(booking.status) && (
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                {/* Progress line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
                
                <div className="space-y-8">
                  {booking.progress.steps.map((step, index) => (
                    <div key={index} className="relative flex gap-4">
                      {/* Step indicator */}
                      <div
                        className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                          step.status === 'completed'
                            ? 'bg-green-500 text-white'
                            : step.status === 'current'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {step.status === 'completed' ? (
                          <Check className="h-6 w-6" />
                        ) : step.status === 'current' ? (
                          <Clock className="h-6 w-6" />
                        ) : (
                          <Circle className="h-6 w-6" />
                        )}
                      </div>

                      {/* Step content */}
                      <div className="pt-2">
                        <h4
                          className={`font-semibold ${
                            step.status === 'upcoming'
                              ? 'text-muted-foreground'
                              : ''
                          }`}
                        >
                          {step.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disputed Status */}
        {booking.status === 'disputed' && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
                <div>
                  <h4 className="font-semibold">Refund Requested</h4>
                  <p className="text-sm text-muted-foreground">
                    Your refund request is being reviewed by the creator.
                  </p>
                  {booking.disputeReason && (
                    <p className="text-sm mt-2">
                      <strong>Reason:</strong> {booking.disputeReason}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Creator info */}
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                {booking.creator.avatarUrl ? (
                  <img
                    src={booking.creator.avatarUrl}
                    alt={booking.creator.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold">{booking.creator.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  @{booking.creator.username}
                </p>
              </div>
            </div>

            {/* Service */}
            <div>
              <p className="text-sm text-muted-foreground">Service</p>
              <p className="font-medium">{booking.priceListItem.name}</p>
              {booking.priceListItem.category && (
                <Badge variant="outline" className="mt-1">
                  {booking.priceListItem.category}
                </Badge>
              )}
            </div>

            {/* Date */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(booking.bookingDate)}</p>
              </div>
            </div>

            {/* Amount */}
            <div>
              <p className="text-sm text-muted-foreground">Amount Paid</p>
              <p className="font-bold text-lg">{formatPrice(booking.totalAmount)}</p>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refund Request Button */}
        {['paid', 'first_payout_done', 'service_day'].includes(booking.status) && (
          <Card>
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setRefundDialogOpen(true)}
              >
                Request Refund
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Only request a refund if the service was not provided as agreed.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
            <DialogDescription>
              Please explain why you&apos;re requesting a refund. The creator will review your request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Please provide a detailed reason for your refund request..."
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefundRequest}
              disabled={!refundReason.trim() || isRequestingRefund}
            >
              {isRequestingRefund ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

