'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  adminTableCellClass,
  adminTableClass,
  adminTableContainerClass,
  adminTableHeadClass,
  adminTableHeadingRowClass,
  adminTableRowClass,
  adminTableScrollClass,
  formatMoneyFromKobo,
  formatRelativeTime,
  statusBadgeClass,
  transactionTypeBadgeClass,
} from '@/lib/admin/format';

type Tx = {
  id: string;
  reference?: string | null;
  type: string;
  status: string;
  amount: number;
  feeAmount: number;
  createdAt: string;
  creator?: { displayName?: string | null; username?: string | null } | null;
  user?: { email?: string | null } | null;
};

type TxResponse = {
  transactions: Tx[];
  page: number;
  total: number;
  totalPages: number;
};

export default function AdminTransactionsPage() {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TxResponse | null>(null);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({
        page: String(page),
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(query ? { q: query } : {}),
      });
      const response = await fetch(`/api/admin/transactions?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload = (await response.json()) as TxResponse;
      setData(payload);
    }
    void load();
  }, [page, query, status, type]);

  const showingLabel = useMemo(() => {
    const total = data?.total || 0;
    const current = data?.transactions.length || 0;
    return `Showing ${current} of ${total}`;
  }, [data]);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Transactions</h2>

      <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-4">
        <select
          value={type}
          onChange={(e) => {
            setPage(1);
            setType(e.target.value);
          }}
          className="h-10 rounded-md border px-3 text-sm"
        >
          <option value="">All Types</option>
          <option value="subscription">Subscription</option>
          <option value="booking">Booking</option>
          <option value="one_time">One-time</option>
          <option value="payout">Payout</option>
          <option value="refund">Refund</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="h-10 rounded-md border px-3 text-sm"
        >
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        <Input
          placeholder="Search creator or fan email"
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
        />
      </div>

      <div className={adminTableContainerClass}>
        <div className={adminTableScrollClass}>
          <table className={adminTableClass}>
            <thead className={adminTableHeadClass}>
              <tr className={adminTableHeadingRowClass}>
                <th className={adminTableCellClass}>Reference</th>
                <th className={adminTableCellClass}>Type</th>
                <th className={adminTableCellClass}>Creator</th>
                <th className={adminTableCellClass}>Fan / Customer</th>
                <th className={adminTableCellClass}>Amount</th>
                <th className={adminTableCellClass}>Fee</th>
                <th className={adminTableCellClass}>Status</th>
                <th className={adminTableCellClass}>Date</th>
              </tr>
            </thead>
            <tbody>
              {(data?.transactions || []).map((tx) => (
                <tr key={tx.id} className={adminTableRowClass}>
                  <td className={`${adminTableCellClass} font-mono text-xs`}>
                    {(tx.reference || tx.id).slice(0, 14)}...
                  </td>
                  <td className={adminTableCellClass}>
                    <Badge className={`border ${transactionTypeBadgeClass(tx.type)}`}>{tx.type}</Badge>
                  </td>
                  <td className={adminTableCellClass}>
                    <p className="font-medium">{tx.creator?.displayName || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">@{tx.creator?.username || 'n/a'}</p>
                  </td>
                  <td className={adminTableCellClass}>{tx.user?.email || '-'}</td>
                  <td className={adminTableCellClass}>{formatMoneyFromKobo(tx.amount)}</td>
                  <td className={adminTableCellClass}>{formatMoneyFromKobo(tx.feeAmount)}</td>
                  <td className={adminTableCellClass}>
                    <Badge className={`border ${statusBadgeClass(tx.status)}`}>{tx.status}</Badge>
                  </td>
                  <td className={adminTableCellClass} title={new Date(tx.createdAt).toLocaleString()}>
                    {formatRelativeTime(tx.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{showingLabel}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!data?.totalPages || page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
