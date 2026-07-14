'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { AuthLumaLayout } from '@/components/auth/AuthLumaLayout';
import {
  authButtonClass,
  authLinkClass,
  authMutedClass,
} from '@/components/auth/styles';

function InviteVerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { toast } = useToast();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setLoadError('Missing invite token');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/auth/invite/status?token=${encodeURIComponent(token)}`,
          { cache: 'no-store' }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Invalid invite');
        }
        if (data.status === 'activated') {
          setLoadError('This invite was already used. Please log in.');
        } else if (data.status !== 'approved') {
          setLoadError('This invite is not ready yet.');
        } else if (!cancelled) {
          setEmail(String(data.email || ''));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Invalid invite');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!loading && email) inputRefs.current[0]?.focus();
  }, [loading, email]);

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
    if (cleaned && index < 5) inputRefs.current[index + 1]?.focus();
  }

  async function handleVerify(e?: React.FormEvent) {
    e?.preventDefault();
    if (code.length !== 6 || !token) return;

    setVerifying(true);
    try {
      const res = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.sessionTokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: data.sessionTokenHash,
          type: 'magiclink',
        });
        if (error) {
          throw new Error(
            'Account activated, but we could not start your session. Please log in with the password you chose when requesting access.'
          );
        }
        toast({ title: 'Welcome', description: 'Your invite is activated.' });
        router.replace('/dashboard');
        return;
      }

      toast({
        title: 'Account activated',
        description: 'Log in with the password you chose when you requested access.',
      });
      router.replace('/login');
    } catch (error) {
      toast({
        title: 'Verification failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <AuthLumaLayout title="Verifying invite">
        <p className={authMutedClass}>Loading invite…</p>
      </AuthLumaLayout>
    );
  }

  if (loadError) {
    return (
      <AuthLumaLayout
        title="Invite unavailable"
        footerExtra={
          <p className={authMutedClass}>
            <Link href="/login" className={authLinkClass}>
              Go to login
            </Link>
          </p>
        }
      >
        <p className={authMutedClass}>{loadError}</p>
      </AuthLumaLayout>
    );
  }

  return (
    <AuthLumaLayout
      title="Enter your invite code"
      footerExtra={
        <p className={authMutedClass}>
          After this, log in anytime with the password you chose.{' '}
          <Link href="/login" className={authLinkClass}>
            Login
          </Link>
        </p>
      }
    >
      <form onSubmit={(e) => void handleVerify(e)} className="foleio-auth-form-stack">
        <div className="foleio-auth-row" style={{ opacity: 0.85 }}>
          <Mail className="foleio-auth-row-icon h-5 w-5" strokeWidth={1.5} />
          <input className="foleio-auth-row-input" value={email} readOnly />
        </div>

        <div>
          <p className="foleio-auth-section-label">6-digit code</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => updateDigit(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !digits[index] && index > 0) {
                    inputRefs.current[index - 1]?.focus();
                  }
                }}
                style={{
                  width: 44,
                  height: 48,
                  textAlign: 'center',
                  fontSize: 18,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(0,0,0,0.25)',
                  color: '#fafafa',
                }}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          className={authButtonClass}
          disabled={verifying || code.length !== 6}
        >
          {verifying ? 'Activating…' : 'Activate account'}
        </button>
      </form>
    </AuthLumaLayout>
  );
}

export default function InviteVerifyPage() {
  return (
    <Suspense
      fallback={
        <AuthLumaLayout title="Verifying invite">
          <p className={authMutedClass}>Loading…</p>
        </AuthLumaLayout>
      }
    >
      <InviteVerifyInner />
    </Suspense>
  );
}
