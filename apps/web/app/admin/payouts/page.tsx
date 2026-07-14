'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminMutedClass, adminPanelClass, statusBadgeClass } from '@/lib/admin/format';

type QueuePayout = {
  id: string;
  amount: number;
  createdAt: string;
  creator: {
    displayName: string;
    payoutMethod?: string | null;
    paystackSubaccountCode?: string | null;
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

function payoutChannelLabel(payout: QueuePayout) {
  const method = String(payout.creator.payoutMethod || '').toUpperCase();
  if (method === 'DIRECT_SUBACCOUNT' || payout.creator.paystackSubaccountCode) {
    return { label: 'DIRECT_SUBACCOUNT', hint: 'Usually paid via split at charge' };
  }
  return { label: 'PLATFORM_HELD', hint: 'Manual queue — platform-held balance' };
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
      <div>
        <h1 className="foleio-admin-title">Payouts</h1>
        <p className={`foleio-admin-meta ${adminMutedClass}`}>
          Manual queue for platform-held balances
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className={adminPanelClass}>
          <p className={`text-sm ${adminMutedClass}`}>Pending requests</p>
          <p className="mt-1 text-2xl font-bold text-[#f4f4f5]">{payload.pendingCount}</p>
        </div>
        <div className={adminPanelClass}>
          <p className={`text-sm ${adminMutedClass}`}>Total to pay out</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">
            {formatNairaFromKobo(payload.totalPending)}
          </p>
        </div>
        <div className={adminPanelClass}>
          <p className={`text-sm ${adminMutedClass}`}>Next payout day</p>
          <p className="mt-1 text-2xl font-bold text-[#f4f4f5]">{nextPayoutDay}</p>
        </div>
      </div>

      {loading ? <p className={`text-sm ${adminMutedClass}`}>Loading payout queue…</p> : null}

      <div className="space-y-4">
        {payload.payouts.map((payout) => {
          const channel = payoutChannelLabel(payout);
          return (
            <div key={payout.id} className={`${adminPanelClass} space-y-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#f4f4f5]">{payout.creator.displayName}</p>
                  <p className={`text-sm ${adminMutedClass}`}>{payout.creator.user.email}</p>
                  <p className={`mt-1 text-xs ${adminMutedClass}`}>
                    Requested {new Date(payout.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge className={`border ${statusBadgeClass(channel.label === 'DIRECT_SUBACCOUNT' ? 'active' : 'pending')}`}>
                      {channel.label}
                    </Badge>
                    <span className={`text-xs ${adminMutedClass}`}>{channel.hint}</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-amber-300">
                  {formatNairaFromKobo(Number(payout.amount || 0))}
                </p>
              </div>

              {payout.creator.bankAccount ? (
                <div className="rounded-xl border border-white/5 bg-[#1a1816] p-4">
                  <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${adminMutedClass}`}>
                    Bank details
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-3">
                      <span className={`text-sm ${adminMutedClass}`}>Bank</span>
                      <span className="text-sm font-medium">{payout.creator.bankAccount.bankName}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className={`text-sm ${adminMutedClass}`}>Account number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {payout.creator.bankAccount.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void copyToClipboard(payout.creator.bankAccount?.accountNumber || '')
                          }
                          className="text-amber-300 hover:opacity-70"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className={`text-sm ${adminMutedClass}`}>Account name</span>
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
                className="w-full rounded-lg border border-white/10 bg-[#1a1816] px-3 py-2 text-sm text-[#f4f4f5]"
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => void handleMarkPaid(payout)}
                  className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={actionLoading === `paid-${payout.id}`}
                >
                  Mark as paid
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleReject(payout)}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                  disabled={actionLoading === `reject-${payout.id}`}
                >
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
        {!loading && !payload.payouts.length ? (
          <div className={`${adminPanelClass} text-sm ${adminMutedClass}`}>Queue is empty.</div>
        ) : null}
      </div>
    </div>
  );
}
