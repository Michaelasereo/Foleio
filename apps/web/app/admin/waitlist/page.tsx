'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
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
  createdAt: string;
};

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [search, setSearch] = useState('');
  const [approved, setApproved] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/admin/waitlist', { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { entries: WaitlistEntry[] };
      setEntries(data.entries);
    }
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

  const approve = async (email: string) => {
    await navigator.clipboard.writeText(email);
    setApproved((prev) => (prev.includes(email) ? prev : [email, ...prev]));
    toast({
      title: 'Email copied',
      description: 'Email copied — add to pilot.ts manually',
    });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Waitlist</h2>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
        <Badge variant="outline">{entries.length} people waiting</Badge>
        <div className="flex gap-2">
          <Input
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button asChild variant="outline">
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
                <th className={adminTableCellClass}>Date Joined</th>
                <th className={adminTableCellClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className={adminTableRowClass}>
                  <td className={adminTableCellClass}>{entry.name}</td>
                  <td className={adminTableCellClass}>{entry.email}</td>
                  <td className={adminTableCellClass} title={new Date(entry.createdAt).toLocaleString()}>
                    {formatRelativeTime(entry.createdAt)}
                  </td>
                  <td className={adminTableCellClass}>
                    <Button size="sm" variant="outline" onClick={() => approve(entry.email)}>
                      Approve
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <p className="mb-2 text-sm font-medium">Approved</p>
        {approved.length ? (
          <div className="flex flex-wrap gap-2">
            {approved.map((email) => (
              <Badge key={email} variant="secondary">
                {email}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No approvals yet.</p>
        )}
      </div>
    </div>
  );
}
