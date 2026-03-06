'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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

type PlatformSubscription = {
  id: string;
  amount: number;
  status: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  creator?: {
    displayName?: string | null;
    username?: string | null;
    platformPlan?: string | null;
    user?: { email?: string | null } | null;
  } | null;
};

export default function AdminBillingPage() {
  const [platformSubs, setPlatformSubs] = useState<PlatformSubscription[]>([]);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/admin/billing', { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { platformSubs: PlatformSubscription[] };
      setPlatformSubs(data.platformSubs);
    }
    void load();
  }, []);

  const stats = useMemo(() => {
    const byPlan = {
      pro: platformSubs.filter((s) => (s.creator?.platformPlan || '').toUpperCase() === 'PRO'),
      premium: platformSubs.filter(
        (s) => (s.creator?.platformPlan || '').toUpperCase() === 'PREMIUM'
      ),
      starter: platformSubs.filter(
        (s) =>
          !s.creator?.platformPlan ||
          ['STARTER', 'FREE'].includes((s.creator.platformPlan || '').toUpperCase())
      ),
    };
    const proMrr = byPlan.pro.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const premiumMrr = byPlan.premium.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    return {
      proCount: byPlan.pro.length,
      premiumCount: byPlan.premium.length,
      starterCount: byPlan.starter.length,
      proMrr,
      premiumMrr,
      totalMrr: proMrr + premiumMrr,
    };
  }, [platformSubs]);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Billing Plans</h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total on Pro</p>
          <p className="text-2xl font-semibold">{stats.proCount}</p>
          <p className="text-xs text-muted-foreground">{formatMoneyFromKobo(stats.proMrr)} MRR</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total on Premium</p>
          <p className="text-2xl font-semibold">{stats.premiumCount}</p>
          <p className="text-xs text-muted-foreground">
            {formatMoneyFromKobo(stats.premiumMrr)} MRR
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total on Starter / Free</p>
          <p className="text-2xl font-semibold">{stats.starterCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total Platform MRR</p>
          <p className="text-2xl font-semibold">{formatMoneyFromKobo(stats.totalMrr)}</p>
        </div>
      </div>

      <div className={adminTableContainerClass}>
        <div className={adminTableScrollClass}>
          <table className={adminTableClass}>
            <thead className={adminTableHeadClass}>
              <tr className={adminTableHeadingRowClass}>
                <th className={adminTableCellClass}>Creator</th>
                <th className={adminTableCellClass}>Plan</th>
                <th className={adminTableCellClass}>Status</th>
                <th className={adminTableCellClass}>Amount</th>
                <th className={adminTableCellClass}>Trial Ends</th>
                <th className={adminTableCellClass}>Current Period End</th>
                <th className={adminTableCellClass}>Joined Date</th>
              </tr>
            </thead>
            <tbody>
              {platformSubs.map((sub) => {
                const plan = (sub.creator?.platformPlan || 'Starter').toUpperCase();
                return (
                  <tr key={sub.id} className={adminTableRowClass}>
                    <td className={adminTableCellClass}>
                      <p className="font-medium">{sub.creator?.displayName || 'Unknown Creator'}</p>
                      <p className="text-xs text-muted-foreground">@{sub.creator?.username || 'n/a'}</p>
                      <p className="text-xs text-muted-foreground">{sub.creator?.user?.email || '-'}</p>
                    </td>
                    <td className={adminTableCellClass}>
                      <Badge variant="outline">{plan}</Badge>
                    </td>
                    <td className={adminTableCellClass}>
                      <Badge className={`border ${statusBadgeClass(sub.status)}`}>{sub.status}</Badge>
                    </td>
                    <td className={adminTableCellClass}>{formatMoneyFromKobo(sub.amount)}/month</td>
                    <td className={adminTableCellClass}>
                      {sub.trialEndsAt ? new Date(sub.trialEndsAt).toLocaleDateString() : '-'}
                    </td>
                    <td className={adminTableCellClass}>
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className={adminTableCellClass}>{new Date(sub.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
