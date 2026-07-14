'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import {
  authButtonClass,
  authCss,
  authInputClass,
  authLabelClass,
  authMutedClass,
} from '@/components/auth/styles';
import foleioLogo from '../../../../foleio-logo.png';

type Step = 'credentials' | 'setup2fa' | 'verify2fa' | 'changePassword';

export function AdminLoginGate() {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('michaelasereo@gmail.com');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [passwordMustChange, setPasswordMustChange] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/auth/me', { cache: 'no-store' });
        const data = await res.json();
        if (data?.authenticated && data.admin?.passwordMustChange) {
          setPasswordMustChange(true);
          setStep('changePassword');
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  async function startSetup2fa() {
    const res = await fetch('/api/admin/auth/setup-2fa', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not start authenticator setup');
    setQrDataUrl(data.qrDataUrl || '');
    setTotpSecret(data.secret || '');
    setStep('setup2fa');
  }

  async function finishLogin(nextPasswordMustChange: boolean) {
    if (nextPasswordMustChange) {
      setPasswordMustChange(true);
      setStep('changePassword');
      return;
    }
    window.location.href = '/admin';
  }

  async function handleCredentials(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setPasswordMustChange(Boolean(data.passwordMustChange));
      if (data.totpEnabled) {
        setStep('verify2fa');
      } else {
        await startSetup2fa();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify2fa(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      await finishLogin(Boolean(data.passwordMustChange ?? passwordMustChange));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmSetup(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth/confirm-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not enable authenticator');
      await finishLogin(Boolean(data.passwordMustChange ?? passwordMustChange));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable authenticator');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword || password,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not change password');
      window.location.href = '/admin';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password');
    } finally {
      setIsSubmitting(false);
    }
  }

  const title =
    step === 'credentials'
      ? 'Admin sign in'
      : step === 'setup2fa'
        ? 'Set up authenticator'
        : step === 'verify2fa'
          ? 'Authenticator code'
          : 'Change password';

  const meta =
    step === 'credentials'
      ? 'Use your operator email and password. You will confirm with Google Authenticator next.'
      : step === 'setup2fa'
        ? 'Scan this QR code in Google Authenticator, then enter the 6-digit code.'
        : step === 'verify2fa'
          ? 'Open Google Authenticator and enter the 6-digit code for Foleio Admin.'
          : 'You must set a new password before using the admin dashboard.';

  return (
    <div className="foleio-auth-root foleio-admin-login relative flex min-h-screen flex-col">
      <style jsx global>{`
        ${authCss}
        body:has(.foleio-admin-login) {
          background: #1a1816 !important;
          color: #f4f4f5 !important;
        }
        body:has(.foleio-admin-login) footer:not(.foleio-auth-legal) {
          display: none !important;
        }
        .foleio-admin-login {
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: #1a1816;
          color: #f4f4f5;
        }
        .foleio-admin-login-card {
          width: 100%;
          max-width: 420px;
          padding: 28px 24px;
          border-radius: 16px;
          background: #212121;
          color: #f4f4f5;
        }
        .foleio-admin-login-title {
          margin: 16px 0 6px;
          color: #f4f4f5;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        .foleio-admin-login-meta {
          margin: 0 0 20px;
          color: #828282;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.45;
        }
        .foleio-admin-login .${authLabelClass} {
          margin-bottom: 12px;
        }
        .foleio-admin-login .${authButtonClass} {
          width: 100%;
          margin-top: 8px;
        }
        .foleio-admin-error {
          margin: 0 0 10px;
          color: #fca5a5;
          font-size: 13px;
        }
        .foleio-admin-qr {
          display: block;
          width: 180px;
          height: 180px;
          margin: 0 auto 14px;
          border-radius: 12px;
          background: #fff;
        }
        .foleio-admin-secret {
          margin: 0 0 14px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #1a1816;
          color: #adadad;
          font-size: 12px;
          word-break: break-all;
          text-align: center;
        }
      `}</style>

      <div className="foleio-admin-login-card">
        <div className="flex justify-center">
          <Image
            src={foleioLogo}
            alt="Foleio"
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </div>

        <h1 className="foleio-admin-login-title">{title}</h1>
        <p className="foleio-admin-login-meta">{meta}</p>

        {step === 'credentials' ? (
          <form onSubmit={handleCredentials}>
            <label className={authLabelClass}>
              Email
              <input
                className={authInputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className={authLabelClass}>
              Password
              <input
                className={authInputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <p className="foleio-admin-error">{error}</p> : null}
            <button className={authButtonClass} type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue
            </button>
          </form>
        ) : null}

        {step === 'setup2fa' ? (
          <>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Authenticator QR code" className="foleio-admin-qr" />
            ) : null}
            {totpSecret ? <p className="foleio-admin-secret">Secret: {totpSecret}</p> : null}
            <form onSubmit={handleConfirmSetup}>
              <label className={authLabelClass}>
                Authenticator code
                <input
                  className={authInputClass}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  required
                />
              </label>
              {error ? <p className="foleio-admin-error">{error}</p> : null}
              <button className={authButtonClass} type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enable & continue
              </button>
            </form>
          </>
        ) : null}

        {step === 'verify2fa' ? (
          <form onSubmit={handleVerify2fa}>
            <label className={authLabelClass}>
              Code
              <input
                className={authInputClass}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
              />
            </label>
            {error ? <p className="foleio-admin-error">{error}</p> : null}
            <button className={authButtonClass} type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verify
            </button>
          </form>
        ) : null}

        {step === 'changePassword' ? (
          <form onSubmit={handleChangePassword}>
            <label className={authLabelClass}>
              Current password
              <input
                className={authInputClass}
                type="password"
                value={currentPassword || password}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </label>
            <label className={authLabelClass}>
              New password
              <input
                className={authInputClass}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </label>
            <label className={authLabelClass}>
              Confirm new password
              <input
                className={authInputClass}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </label>
            {error ? <p className="foleio-admin-error">{error}</p> : null}
            <button className={authButtonClass} type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save password
            </button>
          </form>
        ) : null}

        <p className={`${authMutedClass} mt-4 text-center text-xs`}>Operator console</p>
      </div>
    </div>
  );
}
