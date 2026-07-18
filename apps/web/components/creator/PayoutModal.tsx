'use client';

import { useMemo, useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { formatNaira } from '@foleio/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BankSetupForm } from '@/components/creator/BankSetupForm';

interface PayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  platformPlan: string | null;
  bankAccount: any | null;
  onRefresh: () => Promise<void> | void;
}

export function PayoutModal({
  open,
  onOpenChange,
  availableBalance,
  platformPlan,
  bankAccount: initialBankAccount,
  onRefresh,
}: PayoutModalProps) {
  const [bankAccount, setBankAccount] = useState<any | null>(initialBankAccount);
  const [amountNaira, setAmountNaira] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');

  const amountKobo = Math.round((Number(amountNaira) || 0) * 100);
  const isPro = ['PRO', 'GROWTH', 'PREMIUM'].includes(
    (platformPlan || '').toUpperCase()
  );

  const estimatedArrival = useMemo(() => {
    if (isPro) return 'Today / next business day';
    return 'Next business day';
  }, [isPro]);

  async function requestPayout() {
    setIsSubmitting(true);
    setRequestError('');
    const response = await fetch('/api/creator/payouts/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountKobo }),
    });
    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setRequestError(data.error || 'Payout request failed');
      return;
    }

    await onRefresh();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Withdraw Earnings</DialogTitle>
          <DialogDescription>
            Move your available earnings securely to your verified bank account.
          </DialogDescription>
        </DialogHeader>

        {!bankAccount ? (
          <BankSetupForm onSaved={(saved) => setBankAccount(saved)} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 p-4 text-center">
              <p className="text-sm text-green-700">Available balance</p>
              <p className="text-3xl font-bold text-green-800">{formatNaira(availableBalance / 100)}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm">Amount to withdraw</label>
              <Input
                type="number"
                min={1000}
                max={availableBalance / 100}
                value={amountNaira}
                onChange={(e) => setAmountNaira(e.target.value)}
              />
              <button
                type="button"
                className="mt-1 text-xs text-primary"
                onClick={() => setAmountNaira(String(Math.floor(availableBalance / 100)))}
              >
                Withdraw all
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">{bankAccount.accountName}</p>
                <p className="text-xs text-muted-foreground">
                  {bankAccount.bankName} · ****{String(bankAccount.accountNumber).slice(-4)}
                </p>
              </div>
              <ShieldCheck className="ml-auto h-4 w-4 text-green-600" />
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">Estimated arrival: {estimatedArrival}</p>
              {isPro ? (
                <p className="text-xs font-medium text-primary">Same-day payout — Pro benefit ⚡</p>
              ) : null}
            </div>

            {requestError ? <p className="text-sm text-red-600">{requestError}</p> : null}

            <Button
              onClick={requestPayout}
              disabled={amountKobo < 100000 || amountKobo > availableBalance || isSubmitting}
              className="w-full"
            >
              {isSubmitting
                ? 'Processing...'
                : `Withdraw ${formatNaira(amountKobo / 100)}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
