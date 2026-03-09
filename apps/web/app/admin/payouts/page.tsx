'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

type QueuePayout = {
  id: string;
  amount: number;
  createdAt: string;
  creator: {
    displayName: string;
    user: { email: string };
    bankAccount: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    } | null;
  };
};

type QueuePayload = {
  payouts: QueuePayout[];
  pendingCount: number;
  totalPending: number;
};

function formatNairaFromKobo(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount / 100);
}

export default function AdminPayoutsPage() {
  const [payload, setPayload] = useState<QueuePayload>({
    payouts: [],
    pendingCount: 0,
    totalPending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadQueue() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/payouts/queue', { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as QueuePayload;
      setPayload(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function copyToClipboard(value: string) {
    await navigator.clipboard.writeText(value);
  }

  async function handleMarkPaid(payout: QueuePayout) {
    if (!payout.creator.bankAccount) return;
    const confirmed = window.confirm(
      `Confirm you have sent ${formatNairaFromKobo(Number(payout.amount || 0))} to ${payout.creator.bankAccount.accountNumber} via Paystack?`
    );
    if (!confirmed) return;

    setActionLoading(`paid-${payout.id}`);
    try {
      await fetch('/api/admin/payouts/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId: payout.id, note: notes[payout.id] || '' }),
      });
      await loadQueue();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(payout: QueuePayout) {
    const reason = window.prompt('Reason for rejection (optional):') || '';
    setActionLoading(`reject-${payout.id}`);
    try {
      await fetch('/api/admin/payouts/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId: payout.id, reason }),
      });
      await loadQueue();
    } finally {
      setActionLoading(null);
    }
  }

  const nextPayoutDay = useMemo(() => 'Friday', []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Manual Payout Queue</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-muted-foreground">Pending Requests</p>
          <p className="text-2xl font-bold text-foreground">{payload.pendingCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-muted-foreground">Total to Pay Out</p>
          <p className="text-2xl font-bold text-primary">
            {formatNairaFromKobo(payload.totalPending)}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-muted-foreground">Next Payout Day</p>
          <p className="text-2xl font-bold text-foreground">{nextPayoutDay}</p>
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading payout queue...</p> : null}

      <div className="space-y-4">
        {payload.payouts.map((payout) => (
          <div key={payout.id} className="rounded-2xl border bg-white p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-semibold text-foreground">{payout.creator.displayName}</p>
                <p className="text-sm text-muted-foreground">{payout.creator.user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Requested {new Date(payout.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatNairaFromKobo(Number(payout.amount || 0))}
              </p>
            </div>

            {payout.creator.bankAccount ? (
              <div className="mb-4 rounded-xl bg-muted/50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bank Details
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Bank</span>
                    <span className="text-sm font-medium">
                      {payout.creator.bankAccount.bankName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {payout.creator.bankAccount.accountNumber}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(payout.creator.bankAccount?.accountNumber || '')
                        }
                        className="text-primary hover:opacity-70"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Account Name</span>
                    <span className="text-sm font-medium">
                      {payout.creator.bankAccount.accountName}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <input
              type="text"
              placeholder="Add note (optional)"
              value={notes[payout.id] || ''}
              onChange={(event) =>
                setNotes((prev) => ({ ...prev, [payout.id]: event.target.value }))
              }
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
            />

            <div className="flex gap-2">
              <Button
                onClick={() => handleMarkPaid(payout)}
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
                disabled={actionLoading === `paid-${payout.id}`}
              >
                ✓ Mark as Paid
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReject(payout)}
                className="border-red-200 text-red-600 hover:bg-red-50"
                disabled={actionLoading === `reject-${payout.id}`}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
