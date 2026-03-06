'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Users, Settings, Clock } from 'lucide-react';
import { ServicesManager } from './ServicesManager';
import { AvailabilityManager } from './AvailabilityManager';
import { BookingsList } from './BookingsList';

interface Creator {
  id: string;
  displayName: string;
  username: string;
}

interface Service {
  id: string;
  category: string | null;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number | null;
  orderIndex: number;
  categoryOrderIndex: number;
  isActive: boolean;
  createdAt: string;
  _count: {
    bookings: number;
  };
}

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  priceListItem: {
    name: string;
    price: number;
  };
}

interface Availability {
  id: string;
  date: string;
  isAvailable: boolean;
  maxBookings: number | null;
}

interface BookingDashboardProps {
  creator: Creator;
  services: Service[];
  recentBookings: Booking[];
  availability: Availability[];
}

export function BookingDashboard({
  creator,
  services,
  recentBookings,
  availability
}: BookingDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate stats
  const totalServices = services.length;
  const activeServices = services.filter(s => s.isActive).length;
  const totalBookings = recentBookings.length;
  const upcomingBookings = recentBookings.filter(b =>
    new Date(b.bookingDate) > new Date() && b.status === 'pending'
  ).length;

  const availableDays = availability.filter(a => a.isAvailable).length;
  const totalRevenue = recentBookings.reduce((sum, b) => sum + b.totalAmount, 0);

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Services</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeServices}/{totalServices}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Days</p>
                <p className="text-2xl font-bold text-gray-900">{availableDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">{upcomingBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Bookings */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>Your latest customer bookings</CardDescription>
              </CardHeader>
              <CardContent>
                {recentBookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No bookings yet</p>
                ) : (
                  <div className="space-y-4">
                    {recentBookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{booking.customerName}</p>
                          <p className="text-sm text-gray-500">
                            {booking.priceListItem.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            booking.status === 'completed' ? 'default' :
                            booking.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {booking.status}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(booking.bookingDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Your Services</CardTitle>
                <CardDescription>Services available for booking</CardDescription>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-4">No services created yet</p>
                    <Button onClick={() => setActiveTab('services')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Service
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.slice(0, 5).map((service) => (
                      <div key={service.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-gray-500">
                            ₦{(service.price / 100).toLocaleString()}
                            {service.durationMinutes && ` • ${service.durationMinutes}min`}
                          </p>
                        </div>
                        <Badge variant={service.isActive ? 'default' : 'secondary'}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                    {services.length > 5 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setActiveTab('services')}
                      >
                        View All Services ({services.length})
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with booking management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab('services')}
                >
                  <Settings className="w-6 h-6 mb-2" />
                  Manage Services
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab('availability')}
                >
                  <Calendar className="w-6 h-6 mb-2" />
                  Set Availability
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab('bookings')}
                >
                  <Users className="w-6 h-6 mb-2" />
                  View Bookings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <ServicesManager services={services} />
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityManager creatorId={creator.id} availability={availability} />
        </TabsContent>

        <TabsContent value="bookings">
          <BookingsList bookings={recentBookings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
