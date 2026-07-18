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

function isE2eInviteEmail(email: string): boolean {
  const value = email.trim().toLowerCase();
  return (
    value.includes('+e2e') ||
    value.startsWith('e2e') ||
    /e2e\d/.test(value)
  );
}

export default function AdminAccessPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [e2eCount, setE2eCount] = useState(0);
  const [deletingE2e, setDeletingE2e] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoadError(null);
    const [waitlistRes, e2eRes] = await Promise.all([
      fetch('/api/admin/waitlist', { cache: 'no-store' }),
      fetch('/api/admin/creators/delete-e2e', { cache: 'no-store' }),
    ]);
    if (!waitlistRes.ok) {
      setLoadError('Could not load invites. Refresh and try again.');
      setLoading(false);
      return;
    }
    const data = (await waitlistRes.json()) as { entries: WaitlistEntry[] };
    setEntries(data.entries || []);
    if (e2eRes.ok) {
      const e2eData = (await e2eRes.json()) as { count: number };
      setE2eCount(e2eData.count || 0);
    }
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

  async function deleteInvite(entry: WaitlistEntry) {
    const status = normalizeStatus(entry.status);
    if (status === 'activated') return;

    const ok = window.confirm(
      `Delete invite for ${entry.email}?\n\nThey can rejoin the waitlist with the correct email.`
    );
    if (!ok) return;

    setDeletingId(entry.id);
    try {
      const response = await fetch('/api/admin/waitlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({
          title: 'Could not delete invite',
          description: data.error || 'Try again',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Invite deleted',
        description: entry.email,
      });
      await load();
    } catch {
      toast({
        title: 'Could not delete invite',
        description: 'Network error',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteE2eRow(entry: WaitlistEntry) {
    if (!isE2eInviteEmail(entry.email)) return;
    const ok = window.confirm(
      `Delete e2e account and invite for ${entry.email}?\n\nThis removes the creator (if any), auth user, and waitlist row.`
    );
    if (!ok) return;

    setDeletingEmail(entry.email);
    try {
      const response = await fetch('/api/admin/creators/delete-e2e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE_E2E', email: entry.email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({
          title: 'Could not delete',
          description: data.error || 'Try again',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: data.deletedCount
          ? `Deleted creator for ${entry.email}`
          : `Removed invite for ${entry.email}`,
        description:
          data.waitlistDeleted > 0 ? 'Waitlist row cleared' : 'No waitlist row left',
      });
      await load();
    } catch {
      toast({
        title: 'Could not delete',
        description: 'Network error',
        variant: 'destructive',
      });
    } finally {
      setDeletingEmail(null);
    }
  }

  async function handleDeleteE2e() {
    if (e2eCount === 0) {
      toast({ title: 'No e2e creator accounts found' });
      return;
    }
    const typed = window.prompt(
      `Delete ${e2eCount} e2e creator account${e2eCount === 1 ? '' : 's'} and matching invites?\n\nType DELETE_E2E to confirm:`
    );
    if (typed !== 'DELETE_E2E') {
      toast({ title: 'Cancelled', description: 'Confirmation phrase did not match.' });
      return;
    }

    setDeletingE2e(true);
    try {
      const response = await fetch('/api/admin/creators/delete-e2e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE_E2E' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({
          title: 'Could not delete e2e accounts',
          description: data.error || 'Try again',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: `Deleted ${data.deletedCount || 0} e2e account${
          (data.deletedCount || 0) === 1 ? '' : 's'
        }`,
        description:
          data.waitlistDeleted > 0
            ? `Also cleared ${data.waitlistDeleted} invite${
                data.waitlistDeleted === 1 ? '' : 's'
              }`
            : data.failedCount > 0
              ? `${data.failedCount} failed`
              : undefined,
      });
      await load();
    } catch {
      toast({
        title: 'Could not delete e2e accounts',
        description: 'Network error',
        variant: 'destructive',
      });
    } finally {
      setDeletingE2e(false);
    }
  }

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="foleio-admin-title">Invites</h2>
          <p className={`foleio-admin-meta ${adminMutedClass}`}>
            Approve waitlist signups and resend invite codes
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-red-500/30 bg-transparent text-red-300 hover:bg-red-500/10 hover:text-red-200"
          disabled={deletingE2e || loading || e2eCount === 0}
          onClick={() => void handleDeleteE2e()}
        >
          {deletingE2e
            ? 'Deleting e2e…'
            : e2eCount > 0
              ? `Delete e2e accounts (${e2eCount})`
              : 'No e2e accounts'}
        </Button>
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
                  const e2e = isE2eInviteEmail(entry.email);
                  return (
                    <tr key={entry.id} className={adminTableRowClass}>
                      <td className={adminTableCellClass}>{entry.name}</td>
                      <td className={adminTableCellClass}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{entry.email}</span>
                          {e2e ? (
                            <Badge className="border border-amber-500/30 bg-amber-500/10 text-amber-200">
                              e2e
                            </Badge>
                          ) : null}
                        </div>
                      </td>
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
                        <div className="flex flex-wrap gap-2">
                          {status === 'activated' ? (
                            <span className={`text-sm ${adminMutedClass}`}>Done</span>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-white/10 bg-transparent"
                                disabled={
                                  approvingId === entry.id ||
                                  deletingId === entry.id ||
                                  deletingE2e
                                }
                                onClick={() => void approve(entry)}
                              >
                                {approvingId === entry.id
                                  ? 'Sending…'
                                  : status === 'approved'
                                    ? 'Resend invite'
                                    : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/30 bg-transparent text-red-300 hover:bg-red-500/10"
                                disabled={
                                  deletingId === entry.id ||
                                  approvingId === entry.id ||
                                  deletingE2e
                                }
                                onClick={() => void deleteInvite(entry)}
                              >
                                {deletingId === entry.id ? 'Deleting…' : 'Delete'}
                              </Button>
                            </>
                          )}
                          {e2e ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 bg-transparent text-red-300 hover:bg-red-500/10"
                              disabled={
                                deletingEmail === entry.email ||
                                deletingId === entry.id ||
                                deletingE2e
                              }
                              onClick={() => void deleteE2eRow(entry)}
                            >
                              {deletingEmail === entry.email
                                ? 'Deleting…'
                                : 'Delete e2e'}
                            </Button>
                          ) : null}
                        </div>
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
