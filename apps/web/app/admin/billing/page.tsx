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
import {
  LEGACY_PRO_MONTHLY_KOBO,
  formatFreeFeeLabel,
  formatProFeeLabel,
} from '@/lib/billing/platform-plans';

type PlatformSubscription = {
  id: string;
  plan?: string;
  amount: number;
  status: string;
  billingInterval?: string | null;
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
    growthEligible?: boolean | null;
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
    const planOf = (s: PlatformSubscription) =>
      (s.creator?.platformPlan || s.plan || '').toUpperCase();
    const pro = active.filter((s) => planOf(s) === 'PRO');
    const growth = active.filter(
      (s) => planOf(s) === 'GROWTH' || planOf(s) === 'PREMIUM'
    );
    const legacyZero = active.filter(
      (s) =>
        planOf(s) === 'PRO' &&
        Number(s.amount) === LEGACY_PRO_MONTHLY_KOBO &&
        Number(s.feePercent) === 0
    );
    const recurring = active.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    return {
      proCount: pro.length,
      growthCount: growth.length,
      legacyZero: legacyZero.length,
      activeCount: active.length,
      recurring,
    };
  }, [platformSubs]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="foleio-admin-title">Billing (platform plans)</h2>
        <p className={`foleio-admin-meta ${adminMutedClass}`}>
          Free {formatFreeFeeLabel()} · Pro {formatProFeeLabel()} · ₦3k/mo or ₦7.5k/quarter · legacy Pro 0% until period end
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {[
          { label: 'Active paid', value: String(stats.activeCount) },
          { label: 'Pro', value: String(stats.proCount) },
          { label: 'Growth', value: String(stats.growthCount) },
          { label: 'Legacy 0%', value: String(stats.legacyZero) },
          { label: 'Recurring (period)', value: formatMoneyFromKobo(stats.recurring) },
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
                <th className={adminTableCellClass}>Interval</th>
                <th className={adminTableCellClass}>Status</th>
                <th className={adminTableCellClass}>Amount</th>
                <th className={adminTableCellClass}>Fee %</th>
                <th className={adminTableCellClass}>Growth invite</th>
                <th className={adminTableCellClass}>Fee sync</th>
                <th className={adminTableCellClass}>Period end</th>
              </tr>
            </thead>
            <tbody>
              {platformSubs.map((sub) => {
                const plan = (sub.creator?.platformPlan || sub.plan || 'FREE').toUpperCase();
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
                      {sub.billingInterval || (Number(sub.amount) === LEGACY_PRO_MONTHLY_KOBO ? 'monthly (legacy)' : '—')}
                    </td>
                    <td className={adminTableCellClass}>
                      <Badge className={`border ${statusBadgeClass(sub.status)}`}>{sub.status}</Badge>
                    </td>
                    <td className={adminTableCellClass}>{formatMoneyFromKobo(sub.amount)}</td>
                    <td className={adminTableCellClass}>{Number(sub.feePercent ?? 3.5)}%</td>
                    <td className={adminTableCellClass}>
                      {sub.creator?.growthEligible ? 'Eligible' : '—'}
                    </td>
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
