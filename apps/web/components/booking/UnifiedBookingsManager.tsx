'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Plus,
  Settings,
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { completeService, processRefund, rejectRefund } from '@/lib/actions/booking';

interface Creator {
  id: string;
  displayName: string;
  username: string;
}


interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  bookingDate: string;
  totalAmount: number;
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


interface UnifiedBookingsManagerProps {
  creator: Creator;
  recentBookings: Booking[];
  upcomingBookings: Booking[];
  disputedBookings: Booking[];
  completedBookings: Booking[];
}

export function UnifiedBookingsManager({
  creator,
  recentBookings,
  upcomingBookings,
  disputedBookings,
  completedBookings,
}: UnifiedBookingsManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const handleCompleteService = async (bookingId: string) => {
    setLoading(bookingId);
    try {
      await completeService(bookingId);
      window.location.reload(); // Refresh to show updated status
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
      await processRefund(selectedBooking.id, refundReason);
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

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(priceInKobo / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate stats for overview - use ALL booking data for accurate metrics
  const allBookings = [...upcomingBookings, ...disputedBookings, ...completedBookings];
  const totalBookings = allBookings.length;
  const totalRevenue = allBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
  const activeBookings = upcomingBookings.length;

  // Calculate additional metrics
  const completedBookingsCount = completedBookings.length;
  const disputedBookingsCount = disputedBookings.length;
  const totalEarnings = totalRevenue;
  const averageBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  // Calculate monthly metrics (current month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyBookings = allBookings.filter(booking => {
    const bookingDate = new Date(booking.createdAt);
    return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
  });
  const monthlyRevenue = monthlyBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

  // Calculate previous month metrics for comparison
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthBookings = allBookings.filter(booking => {
    const bookingDate = new Date(booking.createdAt);
    return bookingDate.getMonth() === prevMonth && bookingDate.getFullYear() === prevYear;
  });
  const prevMonthRevenue = prevMonthBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

  // Calculate percentage changes
  const bookingChange = prevMonthBookings.length > 0
    ? ((monthlyBookings.length - prevMonthBookings.length) / prevMonthBookings.length) * 100
    : monthlyBookings.length > 0 ? 100 : 0;

  const revenueChange = prevMonthRevenue > 0
    ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
    : monthlyRevenue > 0 ? 100 : 0;

  // Helper function to format percentage change
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Helper function to get change color
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  // Helper function to render trend indicator
  const renderTrendIndicator = (change: number, size: 'sm' | 'xs' = 'xs') => {
    const sizeClasses = size === 'sm' ? 'h-4 w-4' : 'h-3 w-3';
    const textSize = size === 'sm' ? 'text-sm' : 'text-xs';

    if (change > 0) {
      return (
        <div className={`flex items-center gap-1 ${textSize} ${getChangeColor(change)}`}>
          <TrendingUp className={sizeClasses} />
          <span className="font-medium">{formatChange(change)}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className={`flex items-center gap-1 ${textSize} ${getChangeColor(change)}`}>
          <TrendingDown className={sizeClasses} />
          <span className="font-medium">{formatChange(change)}</span>
        </div>
      );
    } else {
      return (
        <div className={`flex items-center gap-1 ${textSize} text-gray-500`}>
          <Minus className={sizeClasses} />
          <span className="font-medium">0.0%</span>
        </div>
      );
    }
  };

  // Calculate completion rate
  const completionRate = totalBookings > 0 ? Math.round((completedBookingsCount / totalBookings) * 100) : 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-2xl font-bold">{totalBookings}</div>
                  {renderTrendIndicator(bookingChange)}
                </div>
                <p className="text-xs text-muted-foreground">All time bookings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-2xl font-bold">{formatPrice(totalEarnings)}</div>
                  {renderTrendIndicator(revenueChange)}
                </div>
                <p className="text-xs text-muted-foreground">Lifetime earnings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeBookings}</div>
                <p className="text-xs text-muted-foreground">Upcoming services</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Check className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{completedBookingsCount}</div>
                <p className="text-xs text-muted-foreground">Successful services</p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-2xl font-bold">{monthlyBookings.length}</div>
                  {renderTrendIndicator(bookingChange)}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{formatPrice(monthlyRevenue)} earned</p>
                  {renderTrendIndicator(revenueChange)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Booking Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(averageBookingValue)}</div>
                <p className="text-xs text-muted-foreground">Per booking average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Check className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
                <p className="text-xs text-muted-foreground">Services completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disputed</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{disputedBookingsCount}</div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Your latest booking activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{booking.customerName}</p>
                        {getStatusBadge(booking.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {booking.priceListItem.name} • {formatDate(booking.bookingDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatPrice(booking.totalAmount)}</p>
                    </div>
                  </div>
                ))}
                {recentBookings.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No recent bookings</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Management Tab */}
        <TabsContent value="bookings" className="mt-6">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
              <TabsTrigger value="disputed">Disputed ({disputedBookings.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedBookings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-6">
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{booking.customerName}</h3>
                            {getStatusBadge(booking.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {booking.customerEmail}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {booking.customerPhone}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(booking.bookingDate)}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {booking.priceListItem.name}
                            </div>
                            <div className="font-semibold">{formatPrice(booking.totalAmount)}</div>
                          </div>
                          {booking.notes && (
                            <p className="text-sm text-muted-foreground">{booking.notes}</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {['paid', 'first_payout_done'].includes(booking.status) && (
                            <Button
                              onClick={() => handleCompleteService(booking.id)}
                              disabled={loading === booking.id}
                              size="sm"
                            >
                              {loading === booking.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {upcomingBookings.length === 0 && (
                  <Card>
                    <CardContent className="pt-6 text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No upcoming bookings</h3>
                      <p className="text-muted-foreground">Your upcoming bookings will appear here</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="disputed" className="mt-6">
              <div className="space-y-4">
                {disputedBookings.map((booking) => (
                  <Card key={booking.id} className="border-destructive">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-1" />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{booking.customerName}</h3>
                            {getStatusBadge(booking.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {booking.priceListItem.name} • {formatDate(booking.bookingDate)}
                          </p>
                          {booking.disputeReason && (
                            <div className="bg-destructive/10 p-3 rounded-md">
                              <p className="text-sm font-medium mb-1">Dispute Reason:</p>
                              <p className="text-sm">{booking.disputeReason}</p>
                            </div>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setRefundDialogOpen(true);
                              }}
                              disabled={loading === booking.id}
                            >
                              Process Refund
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectRefund(booking.id)}
                              disabled={loading === booking.id}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {disputedBookings.length === 0 && (
                  <Card>
                    <CardContent className="pt-6 text-center py-12">
                      <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No disputed bookings</h3>
                      <p className="text-muted-foreground">All your bookings are running smoothly</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              <div className="space-y-4">
                {completedBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="pt-6">
                      <div className="opacity-75">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{booking.customerName}</h3>
                              {getStatusBadge(booking.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {booking.priceListItem.name} • {formatDate(booking.bookingDate)}
                            </p>
                            <p className="text-sm font-medium">{formatPrice(booking.totalAmount)}</p>
                          </div>
                          <Check className="h-6 w-6 text-green-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {completedBookings.length === 0 && (
                  <Card>
                    <CardContent className="pt-6 text-center py-12">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No completed bookings yet</h3>
                      <p className="text-muted-foreground">Completed bookings will appear here</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>



        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Trends</CardTitle>
                <CardDescription>Your booking activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>Analytics coming soon</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Performance</CardTitle>
                <CardDescription>Track your service popularity and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p className="mb-2">Service analytics coming soon</p>
                  <p className="text-sm">
                    <a href="/price-list" className="text-primary hover:underline">
                      Manage your services →
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Process a refund for {selectedBooking?.customerName}'s booking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Refund Reason</label>
              <textarea
                className="w-full mt-1 p-3 border rounded-md"
                rows={4}
                placeholder="Explain why this refund is being processed..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefundRequest}
              disabled={!refundReason.trim() || loading === selectedBooking?.id}
            >
              {loading === selectedBooking?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Refund'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
