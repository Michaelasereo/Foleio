'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type CreatorHealthRow, type CreatorHealthStatus } from '@/lib/admin/creator-health';
import {
  adminMutedClass,
  adminPanelClass,
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

type Filter = 'all' | 'payments_ready' | 'needs_bank' | CreatorHealthStatus;

function relativeDate(date: Date | null): string {
  if (!date) return '—';
  if (Number.isNaN(date.getTime())) return '—';
  const now = Date.now();
  const diff = date.getTime() - now;
  const abs = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < hour) return rtf.format(Math.round(diff / minute), 'minute');
  if (abs < day) return rtf.format(Math.round(diff / hour), 'hour');
  if (abs < week) return rtf.format(Math.round(diff / day), 'day');
  if (abs < month) return rtf.format(Math.round(diff / week), 'week');
  if (abs < year) return rtf.format(Math.round(diff / month), 'month');
  return rtf.format(Math.round(diff / year), 'year');
}

function statusBadge(status: CreatorHealthStatus) {
  if (status === 'healthy') {
    return <Badge className={`border ${statusBadgeClass('healthy')}`}>Healthy</Badge>;
  }
  if (status === 'at_risk') {
    return <Badge className={`border ${statusBadgeClass('at_risk')}`}>At risk</Badge>;
  }
  return <Badge className={`border ${statusBadgeClass('inactive')}`}>Inactive</Badge>;
}

function filterCreators(creators: CreatorHealthRow[], filter: Filter) {
  if (filter === 'all') return creators;
  if (filter === 'payments_ready') return creators.filter((c) => c.paymentsReady);
  if (filter === 'needs_bank') return creators.filter((c) => !c.paymentsReady);
  return creators.filter((creator) => creator.healthStatus === filter);
}

export default function AdminCreatorsPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [creators, setCreators] = useState<CreatorHealthRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    type CreatorHealthApiRow = Omit<CreatorHealthRow, 'createdAt' | 'lastContentDate'> & {
      createdAt: string;
      lastContentDate: string | null;
    };

    async function load() {
      const response = await fetch('/api/admin/creators', { cache: 'no-store' });
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { creators: CreatorHealthApiRow[] };
      const normalizedCreators: CreatorHealthRow[] = data.creators.map((creator) => ({
        ...creator,
        createdAt: new Date(creator.createdAt),
        lastContentDate: creator.lastContentDate ? new Date(creator.lastContentDate) : null,
      }));
      setCreators(normalizedCreators);
      setLoading(false);
    }
    void load();
  }, []);

  const filtered = useMemo(() => filterCreators(creators, activeFilter), [creators, activeFilter]);

  const totalCreators = creators.length;
  const readyCount = creators.filter((c) => c.paymentsReady).length;
  const proCount = creators.filter(
    (c) => c.platformSubscriptionActive || c.platformPlan === 'PRO'
  ).length;
  const needsBank = creators.filter((c) => !c.paymentsReady).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="foleio-admin-title">Creators</h1>
        <p className={`foleio-admin-meta ${adminMutedClass}`}>
          KYC, bank, subaccount, and Pro fee readiness
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {[
          { label: 'Total', value: totalCreators },
          { label: 'Payments ready', value: readyCount },
          { label: 'Needs setup', value: needsBank },
          { label: 'On Pro', value: proCount },
        ].map((card) => (
          <div key={card.label} className={adminPanelClass}>
            <p className={`text-xs uppercase tracking-wide ${adminMutedClass}`}>{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#f4f4f5]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'payments_ready', label: 'Payments ready' },
            { key: 'needs_bank', label: 'Needs setup' },
            { key: 'healthy', label: 'Healthy' },
            { key: 'at_risk', label: 'At risk' },
            { key: 'inactive', label: 'Inactive' },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant="ghost"
            className={activeFilter === tab.key ? adminTabActiveClass : adminTabIdleClass}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {loading ? <p className={`text-sm ${adminMutedClass}`}>Loading creators…</p> : null}

      {!loading && filtered.length === 0 ? (
        <div className={`${adminPanelClass} py-10 text-center ${adminMutedClass}`}>
          No creators in this filter.
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className={adminTableContainerClass}>
          <div className={adminTableScrollClass}>
            <table className={adminTableClass}>
              <thead className={adminTableHeadClass}>
                <tr className={adminTableHeadingRowClass}>
                  <th className={adminTableCellClass}>Creator</th>
                  <th className={adminTableCellClass}>KYC</th>
                  <th className={adminTableCellClass}>Bank</th>
                  <th className={adminTableCellClass}>Subaccount</th>
                  <th className={adminTableCellClass}>Ready</th>
                  <th className={adminTableCellClass}>Plan / fee</th>
                  <th className={adminTableCellClass}>Bookings</th>
                  <th className={adminTableCellClass}>Earnings</th>
                  <th className={adminTableCellClass}>Health</th>
                  <th className={adminTableCellClass}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((creator) => (
                  <tr key={creator.id} className={adminTableRowClass}>
                    <td className={adminTableCellClass}>
                      <p className="font-medium">{creator.displayName}</p>
                      <p className={`text-xs ${adminMutedClass}`}>@{creator.username}</p>
                      <p className={`text-[10px] ${adminMutedClass}`}>{relativeDate(creator.createdAt)}</p>
                    </td>
                    <td className={adminTableCellClass}>
                      <Badge className={`border ${statusBadgeClass(creator.bvnVerified ? 'active' : 'pending')}`}>
                        {creator.bvnVerified ? 'Verified' : 'Pending'}
                      </Badge>
                    </td>
                    <td className={adminTableCellClass}>
                      {creator.hasBankAccount ? 'Linked' : 'Missing'}
                    </td>
                    <td className={adminTableCellClass}>
                      <p className="text-xs">{creator.subaccountStatus}</p>
                      {creator.paystackSubaccountCode ? (
                        <p className={`font-mono text-[10px] ${adminMutedClass}`}>
                          {creator.paystackSubaccountCode.slice(0, 14)}…
                        </p>
                      ) : null}
                    </td>
                    <td className={adminTableCellClass}>
                      <Badge
                        className={`border ${statusBadgeClass(creator.paymentsReady ? 'active' : 'pending')}`}
                      >
                        {creator.paymentsReady ? 'Ready' : 'Blocked'}
                      </Badge>
                    </td>
                    <td className={adminTableCellClass}>
                      <p>{creator.platformPlan || 'FREE'}</p>
                      <p className={`text-xs ${adminMutedClass}`}>{creator.feePercent}% fee</p>
                    </td>
                    <td className={adminTableCellClass}>{creator.completedBookings}</td>
                    <td className={adminTableCellClass}>{formatMoneyFromKobo(creator.totalEarned)}</td>
                    <td className={adminTableCellClass}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{creator.healthScore}</span>
                        {statusBadge(creator.healthStatus)}
                      </div>
                    </td>
                    <td className={adminTableCellClass}>
                      <div className="flex flex-col gap-1">
                        <Button asChild size="sm" variant="outline" className="border-white/10 bg-transparent">
                          <a href={`mailto:${creator.email}`}>Email</a>
                        </Button>
                        <Button asChild size="sm" className="bg-white/10 text-[#f4f4f5] hover:bg-white/15">
                          <Link href={`/creator/${creator.username}`} target="_blank">
                            Profile
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
