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
  platformFee?: number | string | null;
  creatorEarnings?: number | string | null;
  paymentType?: string | null;
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

export default function AdminTransactionsPage({ embedded = false }: { embedded?: boolean }) {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TxResponse | null>(null);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({
        page: String(page),
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(paymentType ? { paymentType } : {}),
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
  }, [page, query, status, type, paymentType]);

  const showingLabel = useMemo(() => {
    const total = data?.total || 0;
    const current = data?.transactions.length || 0;
    return `Showing ${current} of ${total}`;
  }, [data]);

  return (
    <div className="space-y-5">
      {!embedded ? <h2 className="foleio-admin-title">Transactions</h2> : null}

      <div className="grid gap-3 rounded-[14px] border border-white/5 bg-[#212121] p-4 md:grid-cols-5">
        <select
          value={type}
          onChange={(e) => {
            setPage(1);
            setType(e.target.value);
          }}
          className="h-10 rounded-md border border-white/10 bg-[#1a1816] px-3 text-sm text-[#f4f4f5]"
        >
          <option value="">All Types</option>
          <option value="subscription">Subscription</option>
          <option value="booking">Booking</option>
          <option value="one_time">One-time</option>
          <option value="payout">Payout</option>
          <option value="refund">Refund</option>
        </select>

        <select
          value={paymentType}
          onChange={(e) => {
            setPage(1);
            setPaymentType(e.target.value);
          }}
          className="h-10 rounded-md border border-white/10 bg-[#1a1816] px-3 text-sm text-[#f4f4f5]"
        >
          <option value="">All splits</option>
          <option value="DIRECT_SUBACCOUNT">Subaccount split</option>
          <option value="PLATFORM_HELD">Platform held</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="h-10 rounded-md border border-white/10 bg-[#1a1816] px-3 text-sm text-[#f4f4f5]"
        >
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        <Input
          className="md:col-span-2 border-white/10 bg-[#1a1816] text-[#f4f4f5]"
          placeholder="Search creator, fan email, or reference"
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
                <th className={adminTableCellClass}>Split</th>
                <th className={adminTableCellClass}>Creator</th>
                <th className={adminTableCellClass}>Fan / Customer</th>
                <th className={adminTableCellClass}>Amount</th>
                <th className={adminTableCellClass}>Platform fee</th>
                <th className={adminTableCellClass}>Creator share</th>
                <th className={adminTableCellClass}>Status</th>
                <th className={adminTableCellClass}>Date</th>
              </tr>
            </thead>
            <tbody>
              {(data?.transactions || []).map((tx) => {
                const fee = Number(tx.platformFee ?? tx.feeAmount ?? 0);
                const creatorShare = Number(tx.creatorEarnings ?? 0);
                return (
                  <tr key={tx.id} className={adminTableRowClass}>
                    <td className={`${adminTableCellClass} font-mono text-xs`}>
                      {(tx.reference || tx.id).slice(0, 14)}...
                    </td>
                    <td className={adminTableCellClass}>
                      <Badge className={`border ${transactionTypeBadgeClass(tx.type)}`}>
                        {tx.type}
                      </Badge>
                    </td>
                    <td className={adminTableCellClass}>
                      {tx.paymentType === 'DIRECT_SUBACCOUNT' ? (
                        <Badge className={`border ${statusBadgeClass('active')}`}>Subaccount</Badge>
                      ) : tx.paymentType === 'PLATFORM_HELD' ? (
                        <Badge className={`border ${statusBadgeClass('pending')}`}>Held</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={adminTableCellClass}>
                      <p className="font-medium">{tx.creator?.displayName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        @{tx.creator?.username || 'n/a'}
                      </p>
                    </td>
                    <td className={adminTableCellClass}>{tx.user?.email || '-'}</td>
                    <td className={adminTableCellClass}>{formatMoneyFromKobo(tx.amount)}</td>
                    <td className={adminTableCellClass}>{formatMoneyFromKobo(fee)}</td>
                    <td className={adminTableCellClass}>
                      {creatorShare ? formatMoneyFromKobo(creatorShare) : '—'}
                    </td>
                    <td className={adminTableCellClass}>
                      <Badge className={`border ${statusBadgeClass(tx.status)}`}>{tx.status}</Badge>
                    </td>
                    <td
                      className={adminTableCellClass}
                      title={new Date(tx.createdAt).toLocaleString()}
                    >
                      {formatRelativeTime(tx.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#828282]">{showingLabel}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-white/10 bg-transparent"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            className="border-white/10 bg-transparent"
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
