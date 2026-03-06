'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
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

type Booking = {
  id: string;
  customerName?: string | null;
  customerEmail?: string | null;
  bookingDate?: string | null;
  amount: number;
  status: string;
  trackingToken?: string | null;
  createdAt: string;
  creator?: { username?: string | null } | null;
  priceListItem?: { name?: string | null; price?: number | null } | null;
};

const tabs = ['all', 'pending', 'paid', 'completed', 'disputed', 'refunded'] as const;

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
      <h2 className="text-2xl font-semibold">Bookings</h2>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                <th className={adminTableCellClass}>Booking Date</th>
                <th className={adminTableCellClass}>Total Amount</th>
                <th className={adminTableCellClass}>Status</th>
                <th className={adminTableCellClass}>Tracking Token</th>
                <th className={adminTableCellClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className={`${adminTableRowClass} ${booking.status === 'disputed' ? 'border-l-4 border-l-red-500' : ''}`}
                >
                  <td className={adminTableCellClass}>
                    <p className="font-medium">{booking.customerName || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{booking.customerEmail || '-'}</p>
                  </td>
                  <td className={adminTableCellClass}>@{booking.creator?.username || 'n/a'}</td>
                  <td className={adminTableCellClass}>
                    <p>{booking.priceListItem?.name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoneyFromKobo(Number(booking.priceListItem?.price || 0))}
                    </p>
                  </td>
                  <td
                    className={adminTableCellClass}
                    title={booking.bookingDate ? new Date(booking.bookingDate).toLocaleString() : ''}
                  >
                    {booking.bookingDate ? formatRelativeTime(booking.bookingDate) : '-'}
                  </td>
                  <td className={adminTableCellClass}>{formatMoneyFromKobo(booking.amount)}</td>
                  <td className={adminTableCellClass}>
                    <Badge className={`border ${statusBadgeClass(booking.status)}`}>{booking.status}</Badge>
                  </td>
                  <td className={`${adminTableCellClass} font-mono text-xs`}>{booking.trackingToken || '-'}</td>
                  <td className={adminTableCellClass}>
                    {booking.trackingToken ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/tracking/${booking.trackingToken}`} target="_blank">
                          View Tracking
                        </Link>
                      </Button>
                    ) : (
                      '-'
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
