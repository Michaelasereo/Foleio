'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requireDojahKyc, setRequireDojahKyc] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load settings');
        const data = (await res.json()) as { requireDojahKyc?: boolean };
        if (!cancelled) setRequireDojahKyc(Boolean(data.requireDojahKyc));
      } catch (error) {
        toast({
          title: 'Could not load settings',
          description: error instanceof Error ? error.message : 'Try again',
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  async function save(next: boolean) {
    setSaving(true);
    const previous = requireDojahKyc;
    setRequireDojahKyc(next);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requireDojahKyc: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRequireDojahKyc(previous);
        throw new Error(data.error || 'Failed to save');
      }
      toast({
        title: next ? 'Identity verification required' : 'Identity verification off',
        description: next
          ? 'Creators must complete Dojah KYC before bank setup unlocks bookings.'
          : 'Creators only need a bank account to unlock bookings.',
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <Badge variant="outline">Platform</Badge>
      </div>

      <div className="rounded-lg border bg-white p-5">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings…
          </p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl space-y-2">
              <h3 className="text-base font-semibold">Require identity verification (Dojah)</h3>
              <p className="text-sm text-muted-foreground">
                When on, creators must complete Dojah KYC before adding a bank account, and Book
                stays locked until KYC + bank are done. When off, bank setup alone unlocks
                bookings (while waiting on Dojah production access).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={requireDojahKyc}
                disabled={saving}
                onCheckedChange={(checked) => void save(checked)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => void save(!requireDojahKyc)}
              >
                {saving ? 'Saving…' : requireDojahKyc ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
