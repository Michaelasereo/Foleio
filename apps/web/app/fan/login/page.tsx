'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FanLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function sendCode() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/fan/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send code');
      setStep('otp');
      setMessage('Code sent. Check your email.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(inputCode?: string) {
    const code = (inputCode ?? otp).trim();
    if (code.length !== 6) return;

    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/fan/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid code');
      router.push('/fan/dashboard');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="space-y-2 text-center">
            <h1 className="font-display text-3xl text-primary">Welcome back 👋</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a code to access your dashboard.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'email' ? (
              <>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={sendCode}
                  disabled={loading || !email}
                >
                  {loading ? 'Sending...' : 'Send code'}
                </Button>
              </>
            ) : (
              <>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                    if (value.length === 6) {
                      void verifyCode(value);
                    }
                  }}
                />
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => verifyCode()}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </Button>
                <button
                  type="button"
                  className="w-full text-sm text-accent hover:underline"
                  onClick={sendCode}
                  disabled={loading}
                >
                  Resend code
                </button>
              </>
            )}
            {message ? <p className="text-center text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
