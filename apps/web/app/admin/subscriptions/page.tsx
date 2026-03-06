'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
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

type Subscription = {
  id: string;
  status: string;
  createdAt: string;
  nextBillingDate?: string | null;
  fan?: { email?: string | null } | null;
  creator?: { username?: string | null } | null;
  plan?: { name?: string | null; price?: number | null } | null;
};

const tabs = ['all', 'active', 'canceled', 'past_due'] as const;

export default function AdminSubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('all');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const { toast } = useToast();

  async function load() {
    const params = new URLSearchParams();
    if (activeTab !== 'all') params.set('status', activeTab);
    const response = await fetch(`/api/admin/subscriptions?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = (await response.json()) as { subscriptions: Subscription[] };
    setSubscriptions(data.subscriptions);
  }

  useEffect(() => {
    void load();
  }, [activeTab]);

  const metrics = useMemo(() => {
    const active = subscriptions.filter((item) => item.status === 'active').length;
    const canceled = subscriptions.filter((item) => item.status === 'canceled').length;
    const pastDue = subscriptions.filter((item) => item.status === 'past_due').length;
    const mrr = subscriptions
      .filter((item) => item.status === 'active')
      .reduce((sum, item) => sum + Number(item.plan?.price || 0), 0);
    return { active, canceled, pastDue, mrr };
  }, [subscriptions]);

  const cancelSubscription = async (subscriptionId: string) => {
    const response = await fetch('/api/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId }),
    });
    if (!response.ok) {
      toast({
        title: 'Unable to cancel',
        description: 'The subscription could not be cancelled right now.',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Subscription cancelled', description: 'Admin override applied.' });
    await load();
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Subscriptions</h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total Active</p>
          <p className="text-2xl font-semibold text-green-700">{metrics.active}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total Cancelled</p>
          <p className="text-2xl font-semibold text-red-700">{metrics.canceled}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total Past Due</p>
          <p className="text-2xl font-semibold text-orange-700">{metrics.pastDue}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">MRR from Fan Subscriptions</p>
          <p className="text-2xl font-semibold">{formatMoneyFromKobo(metrics.mrr)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? 'All' : tab.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <div className={adminTableContainerClass}>
        <div className={adminTableScrollClass}>
          <table className={adminTableClass}>
            <thead className={adminTableHeadClass}>
              <tr className={adminTableHeadingRowClass}>
                <th className={adminTableCellClass}>Fan</th>
                <th className={adminTableCellClass}>Creator</th>
                <th className={adminTableCellClass}>Plan</th>
                <th className={adminTableCellClass}>Status</th>
                <th className={adminTableCellClass}>Start Date</th>
                <th className={adminTableCellClass}>Next Billing Date</th>
                <th className={adminTableCellClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => (
                <tr key={subscription.id} className={adminTableRowClass}>
                  <td className={adminTableCellClass}>{subscription.fan?.email || '-'}</td>
                  <td className={adminTableCellClass}>@{subscription.creator?.username || 'n/a'}</td>
                  <td className={adminTableCellClass}>
                    <p>{subscription.plan?.name || '-'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoneyFromKobo(Number(subscription.plan?.price || 0))}/month
                    </p>
                  </td>
                  <td className={adminTableCellClass}>
                    <Badge className={`border ${statusBadgeClass(subscription.status)}`}>
                      {subscription.status}
                    </Badge>
                  </td>
                  <td className={adminTableCellClass}>{new Date(subscription.createdAt).toLocaleDateString()}</td>
                  <td className={adminTableCellClass}>
                    {subscription.nextBillingDate
                      ? new Date(subscription.nextBillingDate).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className={adminTableCellClass}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelSubscription(subscription.id)}
                    >
                      Cancel
                    </Button>
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
