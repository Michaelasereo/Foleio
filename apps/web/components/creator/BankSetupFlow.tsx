'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Bank = { name: string; code: string; slug: string };

interface BankSetupFlowProps {
  onSaved: (bankAccount: any) => void;
}

export function BankSetupFlow({ onSaved }: BankSetupFlowProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [query, setQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadBanks() {
      const response = await fetch('/api/creator/banks');
      if (!response.ok) return;
      const data = await response.json();
      setBanks(data.banks || []);
    }
    void loadBanks();
  }, []);

  const filteredBanks = useMemo(() => {
    if (!query) return banks.slice(0, 8);
    return banks
      .filter((bank) => bank.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }, [banks, query]);

  useEffect(() => {
    async function verifyAccount() {
      if (!selectedBank || accountNumber.length !== 10) return;
      setIsVerifying(true);
      setVerifyError('');
      setVerifiedName('');

      const response = await fetch('/api/creator/bank/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber,
          bankCode: selectedBank.code,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setVerifiedName(data.accountName || '');
      } else {
        setVerifyError(data.error || 'Account not found');
      }
      setIsVerifying(false);
    }

    void verifyAccount();
  }, [selectedBank, accountNumber]);

  async function saveAccount() {
    if (!selectedBank || !verifiedName) return;
    setIsSaving(true);
    const response = await fetch('/api/creator/bank/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountNumber,
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
        accountName: verifiedName,
      }),
    });
    const data = await response.json();
    setIsSaving(false);

    if (response.ok) {
      onSaved(data.bankAccount);
    } else {
      setVerifyError(data.error || 'Failed to save bank account');
    }
  }

  return (
    <div>
      <h3 className="font-semibold">Add your bank account</h3>
      <p className="text-sm text-muted-foreground">
        Your earnings will be sent here. We verify your account name in real time to keep your money safe.
      </p>

      <div className="mt-4 space-y-3">
        <Input
          placeholder="Search bank"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-40 overflow-auto rounded-md border">
          {filteredBanks.map((bank) => (
            <button
              key={bank.code}
              type="button"
              onClick={() => setSelectedBank(bank)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                selectedBank?.code === bank.code ? 'bg-muted' : ''
              }`}
            >
              {bank.name}
            </button>
          ))}
        </div>

        <Input
          placeholder="Account number"
          maxLength={10}
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
        />

        {isVerifying ? (
          <p className="text-sm text-muted-foreground">Verifying account...</p>
        ) : null}

        {verifiedName ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800">{verifiedName}</p>
              <p className="text-xs text-green-600">
                Is this you? Your payout will be sent to this account.
              </p>
            </div>
          </div>
        ) : null}

        {verifyError ? (
          <p className="text-sm text-red-600">{verifyError}</p>
        ) : null}

        <Button disabled={!verifiedName || isSaving} onClick={saveAccount}>
          {isSaving ? 'Saving...' : 'Save Bank Account'}
        </Button>
      </div>
    </div>
  );
}
