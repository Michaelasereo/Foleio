'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  adminMutedClass,
  adminPanelClass,
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
  feePercent?: number;
  feeSynced?: boolean;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  creator?: {
    displayName?: string | null;
    username?: string | null;
    platformPlan?: string | null;
    platformSubscriptionActive?: boolean | null;
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
    const active = platformSubs.filter((s) =>
      ['active', 'trialing'].includes(String(s.status || '').toLowerCase())
    );
    const pro = active.filter((s) => (s.creator?.platformPlan || '').toUpperCase() === 'PRO');
    const zeroFee = active.filter((s) => Number(s.feePercent) === 0);
    const fiveFee = active.filter((s) => Number(s.feePercent) === 5 || Number(s.feePercent) > 0);
    const proMrr = pro.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    return {
      proCount: pro.length,
      proMrr,
      zeroFee: zeroFee.length,
      fiveFee: fiveFee.length,
      activeCount: active.length,
    };
  }, [platformSubs]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="foleio-admin-title">Billing (Platform Pro)</h2>
        <p className={`foleio-admin-meta ${adminMutedClass}`}>
          Pro subscriptions and fee sync (0% vs 5%)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {[
          { label: 'Active Pro', value: String(stats.proCount) },
          { label: 'Pro MRR', value: formatMoneyFromKobo(stats.proMrr) },
          { label: '0% fee synced', value: String(stats.zeroFee) },
          { label: 'Default fee (5%)', value: String(stats.fiveFee) },
        ].map((card) => (
          <div key={card.label} className={adminPanelClass}>
            <p className={`text-xs uppercase tracking-wide ${adminMutedClass}`}>{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#f4f4f5]">{card.value}</p>
          </div>
        ))}
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
                <th className={adminTableCellClass}>Fee %</th>
                <th className={adminTableCellClass}>Fee sync</th>
                <th className={adminTableCellClass}>Period end</th>
                <th className={adminTableCellClass}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {platformSubs.map((sub) => {
                const plan = (sub.creator?.platformPlan || 'FREE').toUpperCase();
                return (
                  <tr key={sub.id} className={adminTableRowClass}>
                    <td className={adminTableCellClass}>
                      <p className="font-medium">{sub.creator?.displayName || 'Unknown Creator'}</p>
                      <p className={`text-xs ${adminMutedClass}`}>@{sub.creator?.username || 'n/a'}</p>
                      <p className={`text-xs ${adminMutedClass}`}>{sub.creator?.user?.email || '—'}</p>
                    </td>
                    <td className={adminTableCellClass}>
                      <Badge variant="outline" className="border-white/10">
                        {plan}
                      </Badge>
                    </td>
                    <td className={adminTableCellClass}>
                      <Badge className={`border ${statusBadgeClass(sub.status)}`}>{sub.status}</Badge>
                    </td>
                    <td className={adminTableCellClass}>{formatMoneyFromKobo(sub.amount)}/mo</td>
                    <td className={adminTableCellClass}>{Number(sub.feePercent ?? 5)}%</td>
                    <td className={adminTableCellClass}>
                      <Badge
                        className={`border ${statusBadgeClass(sub.feeSynced ? 'active' : 'pending')}`}
                      >
                        {sub.feeSynced ? 'Subaccount linked' : 'No subaccount'}
                      </Badge>
                    </td>
                    <td className={adminTableCellClass}>
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className={adminTableCellClass}>
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
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
