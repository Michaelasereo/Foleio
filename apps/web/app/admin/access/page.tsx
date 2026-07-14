'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  adminInputClass,
  adminMutedClass,
  adminPanelClass,
  adminTableCellClass,
  adminTableClass,
  adminTableContainerClass,
  adminTableHeadClass,
  adminTableHeadingRowClass,
  adminTableRowClass,
  adminTableScrollClass,
  formatRelativeTime,
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

export default function AdminAccessPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [search, setSearch] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const { toast } = useToast();

  async function load() {
    const response = await fetch('/api/admin/waitlist', { cache: 'no-store' });
    if (!response.ok) return;
    const data = (await response.json()) as { entries: WaitlistEntry[] };
    setEntries(data.entries);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return entries;
    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(search.toLowerCase()) ||
        entry.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [entries, search]);

  const pendingCount = entries.filter((e) => e.status !== 'activated' && e.status !== 'approved').length;

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
        title: entry.status === 'approved' ? 'Invite resent' : 'Invite emailed',
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

  function statusLabel(status?: string) {
    if (status === 'activated') return 'Activated';
    if (status === 'approved') return 'Approved';
    return 'Pending';
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="foleio-admin-title">Access / Invites</h2>
        <p className={`foleio-admin-meta ${adminMutedClass}`}>
          Approve waitlist signups and resend invite codes
        </p>
      </div>

      <div className={`${adminPanelClass} flex flex-wrap items-center justify-between gap-3`}>
        <Badge variant="outline" className="border-white/10 text-[#adadad]">
          {pendingCount} pending · {entries.length} total
        </Badge>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-64 ${adminInputClass}`}
          />
          <Button asChild variant="outline" className="border-white/10 bg-transparent text-[#f4f4f5]">
            <a href="/api/admin/waitlist?format=csv">Export CSV</a>
          </Button>
        </div>
      </div>

      <div className={adminTableContainerClass}>
        <div className={adminTableScrollClass}>
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
              {filtered.map((entry) => (
                <tr key={entry.id} className={adminTableRowClass}>
                  <td className={adminTableCellClass}>{entry.name}</td>
                  <td className={adminTableCellClass}>{entry.email}</td>
                  <td className={adminTableCellClass}>
                    <Badge className="border border-white/10 bg-white/5 text-[#adadad]">
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
                    {entry.status === 'activated' ? (
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
                          : entry.status === 'approved'
                            ? 'Resend invite'
                            : 'Approve'}
                      </Button>
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
