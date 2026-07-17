'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  adminInputClass,
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
  formatRelativeTime,
  statusBadgeClass,
} from '@/lib/admin/format';

type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  status?: string;
  inviteToken?: string | null;
  approvedAt?: string | null;
  activatedAt?: string | null;
  createdAt: string;
};

type StatusFilter = 'pending' | 'approved' | 'activated' | 'all';

function normalizeStatus(status?: string | null): StatusFilter {
  const value = String(status || 'pending').toLowerCase();
  if (value === 'approved' || value === 'activated') return value;
  return 'pending';
}

function statusRank(status?: string | null): number {
  const normalized = normalizeStatus(status);
  if (normalized === 'pending') return 0;
  if (normalized === 'approved') return 1;
  return 2;
}

export default function AdminAccessPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoadError(null);
    const response = await fetch('/api/admin/waitlist', { cache: 'no-store' });
    if (!response.ok) {
      setLoadError('Could not load invites. Refresh and try again.');
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { entries: WaitlistEntry[] };
    setEntries(data.entries || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const pending = entries.filter((e) => normalizeStatus(e.status) === 'pending').length;
    const approved = entries.filter((e) => normalizeStatus(e.status) === 'approved').length;
    const activated = entries.filter((e) => normalizeStatus(e.status) === 'activated').length;
    return { pending, approved, activated, all: entries.length };
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((entry) => {
        const status = normalizeStatus(entry.status);
        if (statusFilter !== 'all' && status !== statusFilter) return false;
        if (!q) return true;
        return (
          entry.name.toLowerCase().includes(q) ||
          entry.email.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const rankDiff = statusRank(a.status) - statusRank(b.status);
        if (rankDiff !== 0) return rankDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [entries, search, statusFilter]);

  const approve = async (entry: WaitlistEntry) => {
    setApprovingId(entry.id);
    try {
      const res = await fetch('/api/admin/waitlist/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Approve failed');
      }
      toast({
        title:
          normalizeStatus(entry.status) === 'approved'
            ? 'Invite resent'
            : 'Invite emailed',
        description: `Verification code sent to ${entry.email}`,
      });
      await load();
    } catch (error) {
      toast({
        title: 'Could not approve',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setApprovingId(null);
    }
  };

  async function addManualInvite(event: React.FormEvent) {
    event.preventDefault();
    const name = manualName.trim();
    const email = manualEmail.trim().toLowerCase();
    if (!name || !email) {
      toast({
        title: 'Name and email required',
        variant: 'destructive',
      });
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/admin/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not add invite');
      }
      toast({ title: 'Invite added', description: email });
      setManualName('');
      setManualEmail('');
      setStatusFilter('pending');
      await load();
    } catch (error) {
      toast({
        title: 'Could not add invite',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  }

  function statusLabel(status?: string) {
    const normalized = normalizeStatus(status);
    if (normalized === 'activated') return 'Activated';
    if (normalized === 'approved') return 'Approved';
    return 'Pending';
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="foleio-admin-title">Invites</h2>
        <p className={`foleio-admin-meta ${adminMutedClass}`}>
          Approve waitlist signups and resend invite codes
        </p>
      </div>

      <div className={`${adminPanelClass} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="outline" className="border-white/10 text-[#adadad]">
            {counts.pending} pending · {counts.approved} approved · {counts.activated}{' '}
            activated · {counts.all} total
          </Badge>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-64 ${adminInputClass}`}
            />
            <Button
              asChild
              variant="outline"
              className="border-white/10 bg-transparent text-[#f4f4f5]"
            >
              <a href="/api/admin/waitlist?format=csv">Export CSV</a>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'pending', label: `Pending (${counts.pending})` },
              { id: 'approved', label: `Approved (${counts.approved})` },
              { id: 'activated', label: `Activated (${counts.activated})` },
              { id: 'all', label: `All (${counts.all})` },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant="ghost"
              className={statusFilter === tab.id ? adminTabActiveClass : adminTabIdleClass}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <form
        onSubmit={(event) => void addManualInvite(event)}
        className={`${adminPanelClass} flex flex-wrap items-end gap-3`}
      >
        <div className="min-w-[160px] flex-1 space-y-1">
          <label className={`text-xs uppercase tracking-wide ${adminMutedClass}`}>
            Add missing invite
          </label>
          <Input
            placeholder="Full name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className={adminInputClass}
          />
        </div>
        <div className="min-w-[200px] flex-1 space-y-1">
          <label className={`text-xs uppercase tracking-wide ${adminMutedClass}`}>
            Email
          </label>
          <Input
            type="email"
            placeholder="email@example.com"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            className={adminInputClass}
          />
        </div>
        <Button
          type="submit"
          disabled={adding}
          className="bg-white/10 text-[#f4f4f5] hover:bg-white/15"
        >
          {adding ? 'Adding…' : 'Add to pending'}
        </Button>
      </form>

      {loading ? (
        <p className={`text-sm ${adminMutedClass}`}>Loading invites…</p>
      ) : null}

      {loadError ? (
        <div className={`${adminPanelClass} py-8 text-center text-sm text-red-300`}>
          {loadError}
        </div>
      ) : null}

      {!loading && !loadError && filtered.length === 0 ? (
        <div className={`${adminPanelClass} py-10 text-center ${adminMutedClass}`}>
          {search
            ? 'No invites match your search in this filter.'
            : statusFilter === 'pending'
              ? 'No pending invites right now.'
              : 'No invites in this filter.'}
        </div>
      ) : null}

      {!loading && !loadError && filtered.length > 0 ? (
        <div className={adminTableContainerClass}>
          <div className="max-h-[75vh] overflow-auto">
            <table className={adminTableClass}>
              <thead className={adminTableHeadClass}>
                <tr className={adminTableHeadingRowClass}>
                  <th className={adminTableCellClass}>Name</th>
                  <th className={adminTableCellClass}>Email</th>
                  <th className={adminTableCellClass}>Status</th>
                  <th className={adminTableCellClass}>Joined</th>
                  <th className={adminTableCellClass}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const status = normalizeStatus(entry.status);
                  return (
                    <tr key={entry.id} className={adminTableRowClass}>
                      <td className={adminTableCellClass}>{entry.name}</td>
                      <td className={adminTableCellClass}>{entry.email}</td>
                      <td className={adminTableCellClass}>
                        <Badge className={`border ${statusBadgeClass(status)}`}>
                          {statusLabel(entry.status)}
                        </Badge>
                      </td>
                      <td
                        className={adminTableCellClass}
                        title={new Date(entry.createdAt).toLocaleString()}
                      >
                        {formatRelativeTime(entry.createdAt)}
                      </td>
                      <td className={adminTableCellClass}>
                        {status === 'activated' ? (
                          <span className={`text-sm ${adminMutedClass}`}>Done</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/10 bg-transparent"
                            disabled={approvingId === entry.id}
                            onClick={() => void approve(entry)}
                          >
                            {approvingId === entry.id
                              ? 'Sending…'
                              : status === 'approved'
                                ? 'Resend invite'
                                : 'Approve'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
