'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { AuthLumaLayout } from '@/components/auth/AuthLumaLayout';
import {
  authButtonClass,
  authLinkClass,
  authMutedClass,
} from '@/components/auth/styles';

interface EmailVerificationCodeStepProps {
  email: string;
  onBack: () => void;
  /** Where to send the user after a successful verify. */
  nextPath?: string;
  /** Required so we can sign the user in after confirming email via Resend OTP. */
  password?: string;
}

export function EmailVerificationCodeStep({
  email,
  onBack,
  nextPath = '/onboard',
  password,
}: EmailVerificationCodeStepProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join('');

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function updateDigit(index: number, value: string) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 1) {
      const next = [...digits];
      const chars = cleaned.slice(0, 6 - index).split('');
      chars.forEach((char, offset) => {
        next[index + offset] = char;
      });
      setDigits(next);
      const focusAt = Math.min(index + chars.length, 5);
      inputRefs.current[focusAt]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(e?: React.FormEvent) {
    e?.preventDefault();
    if (code.length !== 6 || verifying) return;

    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        toast({
          title: 'Invalid code',
          description: data.error || 'Check the code and try again.',
          variant: 'destructive',
        });
        return;
      }

      if (password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          toast({
            title: 'Email verified',
            description: 'Please log in with your password to continue.',
          });
          router.push('/login');
          return;
        }
      }

      toast({
        title: 'Email verified',
        description: 'Your account is ready.',
      });
      router.push(nextPath);
      router.refresh();
    } catch {
      toast({
        title: 'Error',
        description: 'Could not verify the code. Try again.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resendLoading || cooldown > 0) return;
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({
          title: 'Could not resend',
          description: data.error || 'Try again in a moment.',
          variant: 'destructive',
        });
        return;
      }
      setCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      toast({
        title: 'Code sent',
        description: 'A new 6-digit code is on its way.',
      });
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <AuthLumaLayout
      title="Enter verification code"
      footerExtra={
        <p className={authMutedClass}>
          Wrong email?{' '}
          <button type="button" onClick={onBack} className={authLinkClass}>
            Go back
          </button>
        </p>
      }
    >
      <form onSubmit={(e) => void handleVerify(e)} className="foleio-auth-verify">
        <div className="foleio-auth-verify-card">
          <div className="foleio-auth-verify-label">
            <Mail className="foleio-auth-row-icon h-5 w-5" strokeWidth={1.5} />
            <p className="foleio-auth-verify-copy">Code sent to {email}</p>
          </div>

          <div className="foleio-auth-otp" role="group" aria-label="Verification code">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={6}
                value={digit}
                aria-label={`Digit ${index + 1}`}
                className="foleio-auth-otp-digit"
                onChange={(e) => updateDigit(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => {
                  e.preventDefault();
                  updateDigit(0, e.clipboardData.getData('text'));
                }}
              />
            ))}
          </div>
          <p className="foleio-auth-verify-copy">
            Enter the 6-digit code from your email to activate your account.
          </p>
        </div>

        <div className="foleio-auth-verify-actions">
          <button
            type="submit"
            className={authButtonClass}
            disabled={verifying || code.length !== 6}
          >
            {verifying ? 'Verifying…' : 'Verify code'}
          </button>
          <button
            type="button"
            className="foleio-auth-resend-link"
            onClick={() => void handleResend()}
            disabled={resendLoading || cooldown > 0}
          >
            {resendLoading
              ? 'Sending…'
              : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : 'Resend code'}
          </button>
        </div>
      </form>
    </AuthLumaLayout>
  );
}
