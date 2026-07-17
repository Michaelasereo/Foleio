'use client';

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
  statusBadgeClass,
} from '@/lib/admin/format';

type Order = {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  createdAt: string;
  customerName?: string | null;
  customerEmail?: string | null;
  creator?: { displayName?: string | null; username?: string | null } | null;
  itemCount: number;
  itemSummary: string;
};

const tabs = [
  'all',
  'pending',
  'confirmed',
  'processing',
  'delivered',
  'cancelled',
] as const;

function tabLabel(tab: (typeof tabs)[number]) {
  if (tab === 'all') return 'All';
  return tab.replace(/_/g, ' ');
}

export default function AdminOrdersPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<{
    id: string;
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('status', activeTab);
      const response = await fetch(`/api/admin/orders?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) return;
      const data = (await response.json()) as { orders: Order[] };
      setOrders(data.orders);
    }
    void load();
  }, [activeTab]);

  async function resendEmail(order: Order) {
    if (resendingId) return;
    setResendingId(order.id);
    setResendNotice(null);
    try {
      const response = await fetch('/api/admin/emails/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'shop_order', id: order.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResendNotice({
          id: order.id,
          ok: false,
          message: data?.error || 'Failed to resend email',
        });
      } else {
        setResendNotice({
          id: order.id,
          ok: true,
          message: `Sent to ${data?.sentTo || order.customerEmail || 'customer'}`,
        });
      }
    } catch {
      setResendNotice({
        id: order.id,
        ok: false,
        message: 'Failed to resend email',
      });
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="foleio-admin-title">Shop orders</h2>
        <p className={`foleio-admin-meta ${adminMutedClass}`}>
          Product orders across all creators
        </p>
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
                <th className={adminTableCellClass}>Items</th>
                <th className={adminTableCellClass}>Total</th>
                <th className={adminTableCellClass}>Status</th>
                <th className={adminTableCellClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className={adminTableRowClass}>
                  <td className={adminTableCellClass}>
                    <p className="font-medium">{order.customerName || 'Unknown'}</p>
                    <p className={`text-xs ${adminMutedClass}`}>
                      {order.customerEmail || '—'}
                    </p>
                  </td>
                  <td className={adminTableCellClass}>
                    @{order.creator?.username || 'n/a'}
                  </td>
                  <td className={adminTableCellClass}>
                    <p className="max-w-[280px] truncate" title={order.itemSummary}>
                      {order.itemSummary || '—'}
                    </p>
                    <p className={`text-xs ${adminMutedClass}`}>
                      {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                    </p>
                  </td>
                  <td className={adminTableCellClass}>
                    {formatMoneyFromKobo(order.total)}
                  </td>
                  <td className={adminTableCellClass}>
                    <Badge className={`border ${statusBadgeClass(order.status)}`}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className={adminTableCellClass}>
                    {order.status !== 'pending' &&
                    order.status !== 'cancelled' &&
                    order.customerEmail ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 bg-transparent"
                        disabled={resendingId === order.id}
                        onClick={() => void resendEmail(order)}
                      >
                        {resendingId === order.id ? 'Sending…' : 'Resend email'}
                      </Button>
                    ) : (
                      '—'
                    )}
                    {resendNotice?.id === order.id ? (
                      <p
                        className={`mt-1 text-xs ${resendNotice.ok ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {resendNotice.message}
                      </p>
                    ) : null}
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
