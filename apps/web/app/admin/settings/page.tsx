'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  adminInputClass,
  adminMutedClass,
  adminPanelClass,
  statusBadgeClass,
} from '@/lib/admin/format';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requireDojahKyc, setRequireDojahKyc] = useState(false);

  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [totpEnabled, setTotpEnabled] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTotp, setPasswordTotp] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [resetupPassword, setResetupPassword] = useState('');
  const [resetupCurrentTotp, setResetupCurrentTotp] = useState('');
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupQr, setSetupQr] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupBusy, setSetupBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [settingsRes, meRes] = await Promise.all([
          fetch('/api/admin/settings', { cache: 'no-store' }),
          fetch('/api/admin/auth/me', { cache: 'no-store' }),
        ]);
        if (!settingsRes.ok) throw new Error('Failed to load settings');
        const data = (await settingsRes.json()) as { requireDojahKyc?: boolean };
        if (!cancelled) setRequireDojahKyc(Boolean(data.requireDojahKyc));
        if (meRes.ok) {
          const me = await meRes.json();
          if (!cancelled) {
            setAdminEmail(me?.admin?.email || null);
            setTotpEnabled(Boolean(me?.admin?.totpEnabled));
          }
        }
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

  async function saveKyc(next: boolean) {
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

  async function changePassword() {
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          totpCode: totpEnabled ? passwordTotp : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not change password');
      toast({ title: 'Password updated' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordTotp('');
    } catch (error) {
      toast({
        title: 'Change password failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  }

  async function startResetup() {
    setSetupBusy(true);
    try {
      const res = await fetch('/api/admin/auth/setup-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: resetupPassword,
          currentTotp: resetupCurrentTotp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not start 2FA setup');
      setSetupSecret(data.secret || null);
      setSetupQr(data.qrDataUrl || null);
      toast({ title: 'Scan the new QR code', description: 'Confirm with a code from Authenticator.' });
    } catch (error) {
      toast({
        title: '2FA setup failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSetupBusy(false);
    }
  }

  async function confirmResetup() {
    setSetupBusy(true);
    try {
      const res = await fetch('/api/admin/auth/confirm-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: setupCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      toast({ title: 'Authenticator updated' });
      setTotpEnabled(true);
      setSetupSecret(null);
      setSetupQr(null);
      setSetupCode('');
      setResetupPassword('');
      setResetupCurrentTotp('');
    } catch (error) {
      toast({
        title: 'Confirm failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSetupBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="foleio-admin-title">Settings</h2>
        <Badge variant="outline" className="border-white/10 text-[#adadad]">
          Platform
        </Badge>
      </div>

      <div className={adminPanelClass}>
        {loading ? (
          <p className={`flex items-center gap-2 text-sm ${adminMutedClass}`}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings…
          </p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl space-y-2">
              <h3 className="text-base font-semibold text-[#f4f4f5]">
                Require identity verification (Dojah)
              </h3>
              <p className={`text-sm ${adminMutedClass}`}>
                When on, creators must complete Dojah KYC before adding a bank account, and Book
                stays locked until KYC + bank are done. When off, bank setup alone unlocks bookings.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={requireDojahKyc}
                disabled={saving}
                onCheckedChange={(checked) => void saveKyc(checked)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 bg-transparent"
                disabled={saving}
                onClick={() => void saveKyc(!requireDojahKyc)}
              >
                {saving ? 'Saving…' : requireDojahKyc ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className={`${adminPanelClass} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-[#f4f4f5]">Security</h3>
            <p className={`mt-1 text-sm ${adminMutedClass}`}>
              {adminEmail || 'Admin'} · Authenticator{' '}
              <Badge className={`ml-1 border ${statusBadgeClass(totpEnabled ? 'active' : 'pending')}`}>
                {totpEnabled ? 'Enabled' : 'Not set'}
              </Badge>
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-white/5 bg-[#1a1816] p-4">
            <h4 className="text-sm font-semibold text-[#f4f4f5]">Change password</h4>
            <Input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={adminInputClass}
            />
            <Input
              type="password"
              placeholder="New password (min 8)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={adminInputClass}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={adminInputClass}
            />
            {totpEnabled ? (
              <Input
                inputMode="numeric"
                placeholder="Authenticator code"
                value={passwordTotp}
                onChange={(e) => setPasswordTotp(e.target.value)}
                className={adminInputClass}
              />
            ) : null}
            <Button
              type="button"
              className="bg-white/10 text-[#f4f4f5] hover:bg-white/15"
              disabled={changingPassword}
              onClick={() => void changePassword()}
            >
              {changingPassword ? 'Updating…' : 'Update password'}
            </Button>
          </div>

          <div className="space-y-3 rounded-xl border border-white/5 bg-[#1a1816] p-4">
            <h4 className="text-sm font-semibold text-[#f4f4f5]">Re-setup Authenticator</h4>
            <p className={`text-xs ${adminMutedClass}`}>
              Requires your current password and a current 6-digit code, then scan a new QR.
            </p>
            {!setupQr ? (
              <>
                <Input
                  type="password"
                  placeholder="Current password"
                  value={resetupPassword}
                  onChange={(e) => setResetupPassword(e.target.value)}
                  className={adminInputClass}
                />
                <Input
                  inputMode="numeric"
                  placeholder="Current authenticator code"
                  value={resetupCurrentTotp}
                  onChange={(e) => setResetupCurrentTotp(e.target.value)}
                  className={adminInputClass}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent"
                  disabled={setupBusy || !totpEnabled}
                  onClick={() => void startResetup()}
                >
                  {setupBusy ? 'Starting…' : 'Start re-setup'}
                </Button>
              </>
            ) : (
              <>
                {setupQr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={setupQr} alt="Authenticator QR" className="mx-auto rounded-lg bg-white p-2" />
                ) : null}
                {setupSecret ? (
                  <p className={`break-all font-mono text-xs ${adminMutedClass}`}>Secret: {setupSecret}</p>
                ) : null}
                <Input
                  inputMode="numeric"
                  placeholder="New authenticator code"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                  className={adminInputClass}
                />
                <Button
                  type="button"
                  className="bg-white/10 text-[#f4f4f5] hover:bg-white/15"
                  disabled={setupBusy}
                  onClick={() => void confirmResetup()}
                >
                  {setupBusy ? 'Confirming…' : 'Confirm new 2FA'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
