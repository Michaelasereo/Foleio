'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type BankAccount = {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  recipientCode?: string | null;
  isVerified?: boolean;
};

type BankOption = {
  code: string;
  name: string;
};

export function BankSetupForm({
  onSaved,
  onCancel,
}: {
  onSaved: (bank: BankAccount) => void;
  onCancel?: () => void;
}) {
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [selectedBankName, setSelectedBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/creator/banks')
      .then((r) => r.json())
      .then((d) => setBanks(d.banks || []))
      .catch(() => setBanks([]));
  }, []);

  useEffect(() => {
    if (accountNumber.length === 10 && selectedBankCode) {
      void handleVerify();
    }
  }, [accountNumber, selectedBankCode]);

  async function handleVerify() {
    setIsVerifying(true);
    setVerifiedName('');
    setError('');

    const res = await fetch('/api/creator/bank/verify-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountNumber,
        bankCode: selectedBankCode,
      }),
    });
    const data = await res.json();

    if (data.accountName) {
      setVerifiedName(data.accountName);
    } else {
      setError('Account not found. Check the number and bank.');
    }
    setIsVerifying(false);
  }

  async function handleSave() {
    if (!verifiedName) return;
    setIsSaving(true);
    setError('');

    const res = await fetch('/api/creator/bank/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountNumber,
        bankCode: selectedBankCode,
        bankName: selectedBankName,
        accountName: verifiedName,
      }),
    });
    const data = await res.json();

    if (data.bankAccount) {
      onSaved(data.bankAccount);
    } else {
      setError('Failed to save. Please try again.');
    }
    setIsSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Bank
        </label>
        <select
          value={selectedBankCode}
          onChange={(e) => {
            setSelectedBankCode(e.target.value);
            setSelectedBankName(
              e.target.options[e.target.selectedIndex]?.text || ''
            );
            setVerifiedName('');
          }}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">Select your bank</option>
          {banks
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Account Number
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={10}
          value={accountNumber}
          onChange={(e) => {
            setAccountNumber(e.target.value.replace(/\D/g, ''));
            setVerifiedName('');
            setError('');
          }}
          placeholder="0123456789"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm tracking-widest focus:border-primary focus:outline-none"
        />
      </div>

      {isVerifying && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verifying account...
        </div>
      )}

      {verifiedName && !isVerifying && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-800">{verifiedName}</p>
            <p className="text-xs text-green-600">Account verified by Paystack</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={handleSave}
          disabled={!verifiedName || isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Account'
          )}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Your account is verified directly by Paystack - the same technology used
        by Piggyvest and Cowrywise.
      </p>
    </div>
  );
}
