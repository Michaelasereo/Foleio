'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  adminMutedClass,
  adminTabActiveClass,
  adminTabIdleClass,
  adminTableCellClass,
  adminTableClass,
  adminTableContainerClass,
  adminTableHeadClass,
  adminTableHeadingRowClass,
  adminTableRowClass,
  adminTableScrollClass,
  formatMoneyFromKobo,
  formatRelativeTime,
  statusBadgeClass,
} from '@/lib/admin/format';
import { formatBookingWhen } from '@/lib/booking/slots';

type Booking = {
  id: string;
  customerName?: string | null;
  customerEmail?: string | null;
  bookingDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  amount: number;
  status: string;
  trackingToken?: string | null;
  createdAt: string;
  creator?: { username?: string | null } | null;
  priceListItem?: { name?: string | null; price?: number | null } | null;
};

const tabs = [
  'all',
  'pending',
  'deposit_paid',
  'balance_overdue',
  'paid',
  'first_payout_done',
  'service_day',
  'completed',
  'disputed',
  'refunded',
] as const;

function tabLabel(tab: (typeof tabs)[number]) {
  if (tab === 'all') return 'All';
  return tab.replace(/_/g, ' ');
}

export default function AdminBookingsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('status', activeTab);
      const response = await fetch(`/api/admin/bookings?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { bookings: Booking[] };
      setBookings(data.bookings);
    }
    void load();
  }, [activeTab]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="foleio-admin-title">Bookings</h2>
        <p className={`foleio-admin-meta ${adminMutedClass}`}>Lifecycle from deposit through dispute</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant="ghost"
            className={activeTab === tab ? adminTabActiveClass : adminTabIdleClass}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabel(tab)}
          </Button>
        ))}
      </div>

      <div className={adminTableContainerClass}>
        <div className={adminTableScrollClass}>
          <table className={adminTableClass}>
            <thead className={adminTableHeadClass}>
              <tr className={adminTableHeadingRowClass}>
                <th className={adminTableCellClass}>Customer</th>
                <th className={adminTableCellClass}>Creator</th>
                <th className={adminTableCellClass}>Service</th>
                <th className={adminTableCellClass}>Booking date</th>
                <th className={adminTableCellClass}>Amount</th>
                <th className={adminTableCellClass}>Status</th>
                <th className={adminTableCellClass}>Tracking</th>
                <th className={adminTableCellClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className={`${adminTableRowClass} ${booking.status === 'disputed' ? 'border-l-2 border-l-red-500' : ''}`}
                >
                  <td className={adminTableCellClass}>
                    <p className="font-medium">{booking.customerName || 'Unknown'}</p>
                    <p className={`text-xs ${adminMutedClass}`}>{booking.customerEmail || '—'}</p>
                  </td>
                  <td className={adminTableCellClass}>@{booking.creator?.username || 'n/a'}</td>
                  <td className={adminTableCellClass}>
                    <p>{booking.priceListItem?.name || 'N/A'}</p>
                    <p className={`text-xs ${adminMutedClass}`}>
                      {formatMoneyFromKobo(Number(booking.priceListItem?.price || 0))}
                    </p>
                  </td>
                  <td
                    className={adminTableCellClass}
                    title={
                      booking.bookingDate
                        ? formatBookingWhen(
                            booking.bookingDate,
                            booking.startTime,
                            booking.endTime
                          )
                        : ''
                    }
                  >
                    {booking.bookingDate
                      ? formatBookingWhen(
                          booking.bookingDate,
                          booking.startTime,
                          booking.endTime
                        )
                      : '—'}
                  </td>
                  <td className={adminTableCellClass}>{formatMoneyFromKobo(booking.amount)}</td>
                  <td className={adminTableCellClass}>
                    <Badge className={`border ${statusBadgeClass(booking.status)}`}>
                      {booking.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className={`${adminTableCellClass} font-mono text-xs`}>
                    {booking.trackingToken || '—'}
                  </td>
                  <td className={adminTableCellClass}>
                    {booking.trackingToken ? (
                      <Button asChild size="sm" variant="outline" className="border-white/10 bg-transparent">
                        <Link href={`/tracking/${booking.trackingToken}`} target="_blank">
                          View
                        </Link>
                      </Button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
