'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const options = [
  { value: 'WEEKLY', label: 'Weekly', desc: 'Every Friday' },
  { value: 'BIWEEKLY', label: 'Bi-weekly', desc: '1st & 15th of month' },
  { value: 'MONTHLY', label: 'Monthly', desc: 'Last Friday of month' },
  { value: 'MANUAL', label: 'Manual', desc: "I'll request myself" },
] as const;

interface PayoutScheduleSettingsProps {
  initialFrequency?: string;
}

export function PayoutScheduleSettings({ initialFrequency = 'MANUAL' }: PayoutScheduleSettingsProps) {
  const [frequency, setFrequency] = useState(initialFrequency);
  const [nextPayoutAt, setNextPayoutAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveSchedule() {
    setIsSaving(true);
    const response = await fetch('/api/creator/payouts/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frequency }),
    });
    const data = await response.json();
    setIsSaving(false);
    if (response.ok) {
      setNextPayoutAt(data.nextPayoutAt || null);
    }
  }

  return (
    <div className="rounded-xl border p-6">
      <h3 className="mb-1 font-semibold">Automatic Payouts</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Set it and forget it — we&apos;ll send your earnings automatically on your chosen schedule.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFrequency(option.value)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              frequency === option.value ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <p className="text-sm font-semibold">{option.label}</p>
            <p className="text-xs text-muted-foreground">{option.desc}</p>
          </button>
        ))}
      </div>

      {frequency !== 'MANUAL' && nextPayoutAt ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Next automatic payout:
          <span className="ml-1 font-medium text-foreground">
            {new Date(nextPayoutAt).toLocaleDateString()}
          </span>
        </p>
      ) : null}

      <Button onClick={saveSchedule} className="mt-4 w-full" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Schedule'}
      </Button>
    </div>
  );
}
