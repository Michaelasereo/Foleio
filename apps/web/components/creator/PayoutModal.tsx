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
import { BankSetupFlow } from '@/components/creator/BankSetupFlow';

interface PayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  platformPlan: string | null;
  bankAccount: any | null;
  bvnVerified: boolean;
  onRefresh: () => Promise<void> | void;
}

export function PayoutModal({
  open,
  onOpenChange,
  availableBalance,
  platformPlan,
  bankAccount: initialBankAccount,
  bvnVerified: initialBvnVerified,
  onRefresh,
}: PayoutModalProps) {
  const [bankAccount, setBankAccount] = useState<any | null>(initialBankAccount);
  const [bvnVerified, setBvnVerified] = useState(initialBvnVerified);
  const [bvn, setBvn] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [amountNaira, setAmountNaira] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const amountKobo = Math.round((Number(amountNaira) || 0) * 100);
  const isPro = ['PRO', 'PREMIUM'].includes((platformPlan || '').toUpperCase());

  const estimatedArrival = useMemo(() => {
    if (isPro) return 'Today / next business day';
    return 'Next business day';
  }, [isPro]);

  async function verifyBVN() {
    if (bvn.length !== 11) return;
    setIsVerifying(true);
    setRequestError('');
    const response = await fetch('/api/creator/bank/verify-bvn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bvn }),
    });
    const data = await response.json();
    setIsVerifying(false);

    if (response.ok && data.verified) {
      setBvnVerified(true);
      setVerifiedSuccess(true);
      setBvn('');
      await onRefresh();
      return;
    }

    setRequestError(data.error || 'Verification failed');
  }

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
          <BankSetupFlow onSaved={(saved) => setBankAccount(saved)} />
        ) : !bvnVerified ? (
          <div className="space-y-4">
            {!verifiedSuccess ? (
              <>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h4 className="mb-1 font-semibold text-blue-900">One-time identity check</h4>
                  <p className="text-sm text-blue-800">
                    Your BVN is sent directly to Paystack. Foleio never stores your BVN. We only receive a yes/no confirmation.
                  </p>
                  <p className="mt-2 text-xs text-blue-600">
                    This is the same verification used by major Nigerian fintech products.
                  </p>
                </div>

                <Input
                  placeholder="Enter your BVN"
                  maxLength={11}
                  type="password"
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                />

                <p className="text-xs text-muted-foreground">
                  Your BVN is 11 digits and can be retrieved by dialling *565*0# on your registered phone number.
                </p>

                <Button
                  disabled={bvn.length !== 11 || isVerifying}
                  onClick={verifyBVN}
                  className="w-full"
                >
                  {isVerifying ? 'Verifying...' : 'Verify Identity'}
                </Button>
              </>
            ) : (
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <ShieldCheck className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mb-2 font-display text-xl font-bold">Identity Verified</h3>
                <p className="text-sm text-muted-foreground">
                  Your account is verified and secure. You can now withdraw your earnings anytime.
                </p>
                <Button onClick={() => setVerifiedSuccess(false)} className="mt-4 w-full">
                  Continue to Withdrawal
                </Button>
              </div>
            )}
          </div>
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
