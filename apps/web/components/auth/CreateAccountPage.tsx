'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { Lock, Mail, Pencil, User, Eye, EyeOff } from 'lucide-react';
import { isPilotEmail } from '@/lib/config/pilot';
import { AuthLumaLayout } from '@/components/auth/AuthLumaLayout';
import {
  authButtonClass,
  authLinkClass,
  authMutedClass,
  authRowInputClass,
} from '@/components/auth/styles';

const signupSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .regex(
        /^@?[a-zA-Z0-9._]+$/,
        'Username can only contain letters, numbers, dots, and underscores'
      ),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

function VerificationCodeStep({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
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
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });

      if (error) {
        toast({
          title: 'Invalid code',
          description: error.message || 'Check the code and try again.',
          variant: 'destructive',
        });
        return;
      }

      if (data.session) {
        toast({
          title: 'Email verified',
          description: 'Your account is ready.',
        });
        router.push('/dashboard');
        router.refresh();
      }
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
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) {
        toast({
          title: 'Could not resend',
          description: error.message,
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
            <p className="foleio-auth-verify-copy">
              Code sent to {email}
            </p>
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
            Enter the 6-digit code to activate your account.
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

export function CreateAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === 'verify') {
      setVerificationSent(true);
      setSignupEmail(params.get('email') || 'you@example.com');
    }
  }, []);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: SignupFormValues) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const username = normalizeUsername(data.username);
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

    if (!isPilotEmail(normalizedEmail)) {
      toast({
        title: 'Pilot access only',
        description: 'Signups are currently limited to approved pilot emails.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const emailExistsRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const emailExistsData = await emailExistsRes
        .json()
        .catch(() => ({ exists: false }));
      if (emailExistsData.exists) {
        toast({
          title: 'Account already exists',
          description:
            'An account with this email already exists. Please log in or reset your password.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { data: signupData, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: data.password,
        options: {
          data: {
            full_name: fullName,
            first_name: data.firstName.trim(),
            last_name: data.lastName.trim(),
            username,
          },
        },
      });

      if (error) {
        toast({
          title: 'Signup failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (signupData.user && !signupData.session) {
        setSignupEmail(normalizedEmail);
        setVerificationSent(true);
        return;
      }

      if (signupData.session) {
        router.push('/dashboard');
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (verificationSent) {
    return (
      <VerificationCodeStep
        email={signupEmail}
        onBack={() => {
          setVerificationSent(false);
          if (window.location.search.includes('preview=verify')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  return (
    <AuthLumaLayout
      title="Manage your business on Foleio"
      footerExtra={
        <p className={authMutedClass}>
          Already have an account?{' '}
          <Link href="/login" className={authLinkClass}>
            Login
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="foleio-auth-form-stack"
        >
          <div className="foleio-auth-name-row">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="foleio-auth-row">
                      <Pencil className="foleio-auth-row-icon h-5 w-5" strokeWidth={1.5} />
                      <input
                        placeholder="First name"
                        className={authRowInputClass}
                        autoComplete="given-name"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="foleio-auth-row">
                      <Pencil className="foleio-auth-row-icon h-5 w-5" strokeWidth={1.5} />
                      <input
                        placeholder="Last name"
                        className={authRowInputClass}
                        autoComplete="family-name"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="foleio-auth-row">
                    <Mail className="foleio-auth-row-icon h-5 w-5" strokeWidth={1.5} />
                    <input
                      type="email"
                      placeholder="Email address"
                      className={authRowInputClass}
                      autoComplete="email"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="foleio-auth-row foleio-auth-row-tall">
                    <User className="foleio-auth-row-icon mt-0.5 h-5 w-5" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <input
                        placeholder="Business username"
                        className={authRowInputClass}
                        autoComplete="username"
                        {...field}
                      />
                      <span className="foleio-auth-username-hint">e.g @Shosglam</span>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="foleio-auth-form-gap">
            <p className="foleio-auth-section-label">Security</p>
            <div className="foleio-auth-security">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="foleio-auth-security-row">
                        <Lock className="foleio-auth-row-icon h-5 w-5" strokeWidth={1.5} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter password"
                          className="foleio-auth-security-input"
                          autoComplete="new-password"
                          {...field}
                        />
                        <button
                          type="button"
                          className="foleio-auth-eye-btn"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" strokeWidth={1.5} />
                          ) : (
                            <Eye className="h-5 w-5" strokeWidth={1.5} />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="foleio-auth-security-row">
                        <Lock className="foleio-auth-row-icon h-5 w-5" strokeWidth={1.5} />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm password"
                          className="foleio-auth-security-input"
                          autoComplete="new-password"
                          {...field}
                        />
                        <button
                          type="button"
                          className="foleio-auth-eye-btn"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          aria-label={
                            showConfirmPassword
                              ? 'Hide confirm password'
                              : 'Show confirm password'
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" strokeWidth={1.5} />
                          ) : (
                            <Eye className="h-5 w-5" strokeWidth={1.5} />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <button type="submit" className={authButtonClass} disabled={isLoading}>
            {isLoading ? 'Setting up…' : 'Setup Business'}
          </button>
        </form>
      </Form>
    </AuthLumaLayout>
  );
}
