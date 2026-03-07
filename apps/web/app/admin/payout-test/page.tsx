'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Bank = {
  id: number;
  name: string;
  code: string;
};

type StepState = 'idle' | 'loading' | 'success' | 'error';

function formatNaira(amountKobo: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amountKobo / 100);
}

function getMessage(payload: any, fallback: string) {
  return payload?.message || payload?.error || fallback;
}

function Dot({ state }: { state: StepState }) {
  if (state === 'success') return <span className="h-3 w-3 rounded-full bg-green-500" />;
  if (state === 'loading') return <span className="h-3 w-3 rounded-full bg-amber-500" />;
  if (state === 'error') return <span className="h-3 w-3 rounded-full bg-red-500" />;
  return <span className="h-3 w-3 rounded-full bg-muted-foreground/50" />;
}

function ResultBox({
  state,
  message,
}: {
  state: StepState;
  message: string;
}) {
  if (state === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <Loader2 className="h-4 w-4 animate-spin" />
        Processing...
      </div>
    );
  }

  if (!message) return null;

  if (state === 'success') {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
        {message}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
        {message}
      </div>
    );
  }

  return null;
}

function RawResponse({ data }: { data: any }) {
  if (!data) return null;

  return (
    <details className="rounded-md border bg-zinc-950 text-zinc-100">
      <summary className="cursor-pointer px-3 py-2 text-sm">Show raw response ↓</summary>
      <pre className="max-h-64 overflow-auto border-t border-zinc-800 px-3 py-2 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

export default function AdminPayoutTestPage() {
  const [balanceState, setBalanceState] = useState<StepState>('idle');
  const [balanceMessage, setBalanceMessage] = useState('');
  const [balanceRaw, setBalanceRaw] = useState<any>(null);
  const [balanceKobo, setBalanceKobo] = useState(0);

  const [step1State, setStep1State] = useState<StepState>('idle');
  const [step1Message, setStep1Message] = useState('');
  const [step1Raw, setStep1Raw] = useState<any>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankSearch, setBankSearch] = useState('');

  const [step2State, setStep2State] = useState<StepState>('idle');
  const [step2Message, setStep2Message] = useState('');
  const [step2Raw, setStep2Raw] = useState<any>(null);
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [verifiedName, setVerifiedName] = useState('');

  const [step3State, setStep3State] = useState<StepState>('idle');
  const [step3Message, setStep3Message] = useState('');
  const [step3Raw, setStep3Raw] = useState<any>(null);
  const [accountName, setAccountName] = useState('');
  const [recipientCode, setRecipientCode] = useState('');

  const [step4State, setStep4State] = useState<StepState>('idle');
  const [step4Message, setStep4Message] = useState('');
  const [step4Raw, setStep4Raw] = useState<any>(null);
  const [amount, setAmount] = useState('100');
  const [reason, setReason] = useState('Foleio creator payout test');
  const [transferReference, setTransferReference] = useState('');

  const [step5State, setStep5State] = useState<StepState>('idle');
  const [step5Message, setStep5Message] = useState('');
  const [step5Raw, setStep5Raw] = useState<any>(null);

  const lastVerifyKey = useRef('');

  const canStep2 = step1State === 'success';
  const canStep3 = step2State === 'success';
  const canStep4 = step3State === 'success';
  const canStep5 = step4State === 'success' || step4State === 'error';

  const sortedBanks = useMemo(
    () => [...banks].sort((a, b) => a.name.localeCompare(b.name)),
    [banks]
  );

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return sortedBanks;
    return sortedBanks.filter((bank) => bank.name.toLowerCase().includes(q));
  }, [bankSearch, sortedBanks]);

  const selectedBank = useMemo(
    () => banks.find((b) => b.code === selectedBankCode) || null,
    [banks, selectedBankCode]
  );

  async function loadBalance() {
    setBalanceState('loading');
    setBalanceMessage('');
    try {
      const res = await fetch('/api/admin/payout/balance', { cache: 'no-store' });
      const data = await res.json();
      setBalanceRaw(data);
      if (!res.ok) {
        setBalanceState('error');
        setBalanceMessage(getMessage(data, 'Failed to load balance'));
        return;
      }
      const balanceValue = Number(data?.data?.[0]?.balance || 0);
      setBalanceKobo(balanceValue);
      setBalanceState('success');
      setBalanceMessage(`Balance loaded: ${formatNaira(balanceValue)}`);
    } catch {
      setBalanceState('error');
      setBalanceMessage('Failed to load balance');
    }
  }

  useEffect(() => {
    void loadBalance();
  }, []);

  useEffect(() => {
    if (!canStep2) return;
    const cleanAccount = accountNumber.replace(/\D/g, '').slice(0, 10);
    if (cleanAccount.length !== 10 || !selectedBankCode) return;

    const verifyKey = `${selectedBankCode}:${cleanAccount}`;
    if (verifyKey === lastVerifyKey.current) return;
    lastVerifyKey.current = verifyKey;

    const timer = setTimeout(async () => {
      setStep2State('loading');
      setStep2Message('');
      setVerifiedName('');
      try {
        const res = await fetch('/api/admin/payout/verify-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountNumber: cleanAccount, bankCode: selectedBankCode }),
        });
        const data = await res.json();
        setStep2Raw(data);
        if (!res.ok || data?.status === false) {
          setStep2State('error');
          setStep2Message(getMessage(data, 'Account verification failed'));
          return;
        }

        const accountNameValue = String(data?.data?.account_name || '').trim();
        setVerifiedName(accountNameValue);
        setAccountName(accountNameValue);
        setStep2State('success');
        setStep2Message(`✓ ${accountNameValue} — ${selectedBank?.name || 'Verified bank'}`);
      } catch {
        setStep2State('error');
        setStep2Message('Account verification failed');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [accountNumber, canStep2, selectedBank?.name, selectedBankCode]);

  async function handleLoadBanks() {
    setStep1State('loading');
    setStep1Message('');
    try {
      const res = await fetch('/api/admin/payout/banks', { cache: 'no-store' });
      const data = await res.json();
      setStep1Raw(data);
      if (!res.ok || data?.status === false) {
        setStep1State('error');
        setStep1Message(getMessage(data, 'Failed to load banks'));
        return;
      }
      const loadedBanks = (data?.data || []) as Bank[];
      setBanks(loadedBanks);
      setStep1State('success');
      setStep1Message(`${loadedBanks.length} banks loaded`);
    } catch {
      setStep1State('error');
      setStep1Message('Failed to load banks');
    }
  }

  async function handleCreateRecipient() {
    if (!canStep3) return;
    setStep3State('loading');
    setStep3Message('');
    try {
      const res = await fetch('/api/admin/payout/create-recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountName,
          accountNumber: accountNumber.replace(/\D/g, '').slice(0, 10),
          bankCode: selectedBankCode,
        }),
      });
      const data = await res.json();
      setStep3Raw(data);
      if (!res.ok || data?.status === false) {
        setStep3State('error');
        setStep3Message(getMessage(data, 'Failed to create recipient'));
        return;
      }
      const code = String(data?.data?.recipient_code || '');
      setRecipientCode(code);
      setStep3State('success');
      setStep3Message(`✓ Recipient created — ${code}`);
    } catch {
      setStep3State('error');
      setStep3Message('Failed to create recipient');
    }
  }

  async function handleSendTransfer() {
    if (!canStep4) return;
    const sendAmount = Number(amount);
    if (sendAmount <= 0) {
      setStep4State('error');
      setStep4Message('Amount must be greater than 0');
      return;
    }

    if (!window.confirm(`Send NGN ${sendAmount} to ${recipientCode}? This cannot be undone.`)) {
      return;
    }

    setStep4State('loading');
    setStep4Message('');
    try {
      const res = await fetch('/api/admin/payout/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientCode,
          amount: sendAmount,
          reason,
        }),
      });
      const data = await res.json();
      setStep4Raw(data);
      setTransferReference(String(data?.data?.reference || ''));

      const status = String(data?.data?.status || '').toLowerCase();
      const message = String(data?.message || '').toLowerCase();

      if (!res.ok || data?.status === false) {
        setStep4State('error');
        setStep4Message(getMessage(data, 'Transfer failed'));
        return;
      }

      if (status === 'success') {
        setStep4State('success');
        setStep4Message('Transfer successful');
      } else if (status === 'pending') {
        setStep4State('success');
        setStep4Message('Transfer pending — check Step 5');
      } else if (status === 'otp' || message.includes('otp')) {
        setStep4State('success');
        setStep4Message(
          'OTP required — approve on your Paystack-registered phone, then disable OTP in Paystack Settings → Preferences → OTP for transfers'
        );
      } else if (status === 'failed') {
        setStep4State('error');
        setStep4Message(getMessage(data, 'Transfer failed'));
      } else {
        setStep4State('success');
        setStep4Message(getMessage(data, 'Transfer request sent'));
      }
    } catch {
      setStep4State('error');
      setStep4Message('Failed to send transfer');
    }
  }

  async function handleVerifyTransfer() {
    if (!transferReference.trim()) return;
    setStep5State('loading');
    setStep5Message('');
    try {
      const ref = encodeURIComponent(transferReference.trim());
      const res = await fetch(`/api/admin/payout/verify-transfer/${ref}`, { cache: 'no-store' });
      const data = await res.json();
      setStep5Raw(data);
      if (!res.ok || data?.status === false) {
        setStep5State('error');
        setStep5Message(getMessage(data, 'Transfer verification failed'));
        return;
      }

      const transferStatus = String(data?.data?.status || 'unknown').toLowerCase();
      setStep5State('success');
      setStep5Message(`Status: ${transferStatus}`);
    } catch {
      setStep5State('error');
      setStep5Message('Transfer verification failed');
    }
  }

  function resetAll() {
    setStep1State('idle');
    setStep1Message('');
    setStep1Raw(null);
    setBanks([]);
    setBankSearch('');

    setStep2State('idle');
    setStep2Message('');
    setStep2Raw(null);
    setSelectedBankCode('');
    setAccountNumber('');
    setVerifiedName('');
    setAccountName('');
    lastVerifyKey.current = '';

    setStep3State('idle');
    setStep3Message('');
    setStep3Raw(null);
    setRecipientCode('');

    setStep4State('idle');
    setStep4Message('');
    setStep4Raw(null);
    setAmount('100');
    setReason('Foleio creator payout test');
    setTransferReference('');

    setStep5State('idle');
    setStep5Message('');
    setStep5Raw(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Payout Test Console</h2>
          <p className="text-sm text-muted-foreground">Internal end-to-end Paystack payout tester</p>
        </div>
        <Button variant="outline" onClick={resetAll}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-medium">Test console — uses your live PAYSTACK_SECRET_KEY from environment variables.</p>
        <p>Real money moves on live transfers.</p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold">Paystack Balance</h3>
          <Button variant="outline" size="sm" onClick={loadBalance} disabled={balanceState === 'loading'}>
            {balanceState === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-2xl font-semibold">{formatNaira(balanceKobo)}</p>
        {balanceKobo >= 100000 ? (
          <p className="mt-2 text-sm text-green-700">Balance is healthy for testing.</p>
        ) : balanceKobo > 0 ? (
          <p className="mt-2 text-sm text-amber-700">Low balance: less than NGN 1,000.</p>
        ) : (
          <p className="mt-2 text-sm text-red-700">Fund your Paystack balance first</p>
        )}
        <ResultBox state={balanceState} message={balanceMessage} />
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                1
              </span>
              Load Banks
            </h3>
            <Dot state={step1State} />
          </div>
          <Button onClick={handleLoadBanks} disabled={step1State === 'loading'}>
            {step1State === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Load Nigerian Banks
          </Button>
          <ResultBox state={step1State} message={step1Message} />
          <RawResponse data={step1Raw} />
        </div>

        <div
          className={cn('rounded-lg border bg-white p-4', !canStep2 && 'opacity-40')}
          title={!canStep2 ? 'Complete previous step first' : undefined}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                2
              </span>
              Verify Account
            </h3>
            <Dot state={step2State} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Search bank..."
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              disabled={!canStep2}
            />
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={selectedBankCode}
              onChange={(e) => {
                setSelectedBankCode(e.target.value);
                lastVerifyKey.current = '';
              }}
              disabled={!canStep2}
            >
              <option value="">Select bank</option>
              {filteredBanks.map((bank) => (
                <option key={bank.id} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="10-digit account number"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                lastVerifyKey.current = '';
              }}
              disabled={!canStep2}
            />
          </div>
          <ResultBox state={step2State} message={step2Message} />
          {verifiedName ? (
            <div className="mt-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
              ✓ {verifiedName} — {selectedBank?.name || 'Verified bank'}
            </div>
          ) : null}
          <RawResponse data={step2Raw} />
        </div>

        <div
          className={cn('rounded-lg border bg-white p-4', !canStep3 && 'opacity-40')}
          title={!canStep3 ? 'Complete previous step first' : undefined}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                3
              </span>
              Create Recipient
            </h3>
            <Dot state={step3State} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Account name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              disabled={!canStep3}
            />
            <Button onClick={handleCreateRecipient} disabled={!canStep3 || step3State === 'loading' || !accountName}>
              {step3State === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Transfer Recipient
            </Button>
          </div>
          <ResultBox state={step3State} message={step3Message} />
          <RawResponse data={step3Raw} />
        </div>

        <div
          className={cn('rounded-lg border bg-white p-4', !canStep4 && 'opacity-40')}
          title={!canStep4 ? 'Complete previous step first' : undefined}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                4
              </span>
              Send Transfer
            </h3>
            <Dot state={step4State} />
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Recipient code"
              value={recipientCode}
              onChange={(e) => setRecipientCode(e.target.value)}
              disabled={!canStep4}
            />
            <Input
              type="number"
              min={100}
              placeholder="Amount in NGN"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!canStep4}
            />
            <Input
              placeholder="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!canStep4}
            />
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              This sends real money. Verify all details above.
            </div>
            <Button
              variant="destructive"
              onClick={handleSendTransfer}
              disabled={!canStep4 || step4State === 'loading' || !recipientCode}
            >
              {step4State === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Transfer
            </Button>
          </div>
          <ResultBox state={step4State} message={step4Message} />
          <RawResponse data={step4Raw} />
        </div>

        <div
          className={cn('rounded-lg border bg-white p-4', !canStep5 && 'opacity-40')}
          title={!canStep5 ? 'Complete previous step first' : undefined}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                5
              </span>
              Verify Transfer Status
            </h3>
            <Dot state={step5State} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Transfer reference"
              value={transferReference}
              onChange={(e) => setTransferReference(e.target.value)}
              disabled={!canStep5}
            />
            <Button onClick={handleVerifyTransfer} disabled={!canStep5 || step5State === 'loading' || !transferReference}>
              {step5State === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Check Status
            </Button>
          </div>

          {step5Raw?.data ? (
            <div className="mt-3 space-y-2 rounded-md border bg-muted/20 p-3 text-sm">
              <div className="flex items-center gap-2">
                {String(step5Raw?.data?.status || '').toLowerCase() === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : String(step5Raw?.data?.status || '').toLowerCase() === 'failed' ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                <span className="font-medium">Status: {String(step5Raw.data.status || 'unknown')}</span>
              </div>
              <p>Amount: {formatNaira(Number(step5Raw.data.amount || 0))}</p>
              <p>Transfer code: {step5Raw.data.transfer_code || '-'}</p>
              <p>Created: {step5Raw.data.createdAt ? new Date(step5Raw.data.createdAt).toLocaleString() : '-'}</p>
            </div>
          ) : null}

          <ResultBox state={step5State} message={step5Message} />
          <RawResponse data={step5Raw} />
        </div>
      </div>
    </div>
  );
}
