'use client';

import { useEffect, useState } from 'react';
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
import { Lock, Mail } from 'lucide-react';
import { AuthLumaLayout } from '@/components/auth/AuthLumaLayout';
import { AuthRedirectOverlay } from '@/components/auth/AuthRedirectOverlay';
import { EmailVerificationCodeStep } from '@/components/auth/EmailVerificationCodeStep';
import {
  authButtonClass,
  authLinkClass,
  authMutedClass,
  authRowInputClass,
} from '@/components/auth/styles';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function isEmailNotConfirmed(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('email not confirmed') ||
    lower.includes('confirm your email') ||
    lower.includes('email address not confirmed')
  );
}

export default function LoginPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(null);
  const [pendingVerifyPassword, setPendingVerifyPassword] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!redirecting) return;
    const timer = window.setTimeout(() => {
      if (window.location.pathname.startsWith('/login')) {
        setRedirecting(false);
        setIsLoading(false);
        toast({
          title: 'Dashboard is taking longer than expected',
          description: 'You can retry login in a moment if this persists.',
          variant: 'destructive',
        });
      }
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [redirecting, toast]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    let didStartRedirect = false;
    setIsLoading(true);
    const email = data.email.trim().toLowerCase();
    try {
      const statusRes = await fetch(
        `/api/auth/invite/status?email=${encodeURIComponent(email)}`,
        { cache: 'no-store' }
      );
      if (statusRes.ok) {
        const statusData = (await statusRes.json()) as {
          status?: string | null;
        };
        if (statusData.status === 'pending') {
          toast({
            title: 'Invite pending',
            description:
              'Your invite request is waiting for approval. We’ll email you when it’s ready.',
            variant: 'destructive',
          });
          return;
        }
        if (statusData.status === 'approved') {
          toast({
            title: 'Finish verification',
            description:
              'Your invite was approved. Open the verification link in your email and enter the code.',
            variant: 'destructive',
          });
          return;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });

      if (error) {
        if (isEmailNotConfirmed(error.message)) {
          const resendRes = await fetch('/api/auth/resend-email-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const resendData = (await resendRes.json().catch(() => ({}))) as {
            error?: string;
          };
          if (!resendRes.ok) {
            toast({
              title: 'Email not verified',
              description:
                resendData.error || 'Could not send verification code.',
              variant: 'destructive',
            });
            return;
          }
          setPendingVerifyEmail(email);
          setPendingVerifyPassword(data.password);
          toast({
            title: 'Verify your email',
            description: 'We sent a 6-digit code to finish activating your account.',
          });
          return;
        }

        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'You have been logged in successfully',
      });

      didStartRedirect = true;
      setRedirecting(true);

      let nextPath = '/dashboard';
      try {
        const statusRes = await fetch('/api/auth/onboarding-status', {
          cache: 'no-store',
        });
        const status = (await statusRes.json().catch(() => ({}))) as {
          hasCompletedOnboarding?: boolean;
          hasCreator?: boolean;
        };
        if (!status.hasCreator || !status.hasCompletedOnboarding) {
          nextPath = '/onboard';
        }
      } catch {
        // Fall through to dashboard; layout redirects if Creator is missing.
      }
      window.location.assign(nextPath);
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      if (!didStartRedirect) {
        setIsLoading(false);
      }
    }
  }

  if (pendingVerifyEmail) {
    return (
      <EmailVerificationCodeStep
        email={pendingVerifyEmail}
        password={pendingVerifyPassword}
        nextPath="/onboard"
        onBack={() => {
          setPendingVerifyEmail(null);
          setPendingVerifyPassword('');
        }}
      />
    );
  }

  return (
    <>
      {redirecting && (
        <AuthRedirectOverlay message="Taking you to your dashboard" />
      )}
      <AuthLumaLayout
        title="Welcome back"
        footerExtra={
          <p className={authMutedClass}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className={authLinkClass}>
              Sign up
            </Link>
          </p>
        }
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="foleio-auth-form-stack">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="foleio-auth-row">
                      <Mail className="foleio-auth-row-icon h-4 w-4" />
                      <input
                        type="email"
                        placeholder="Email address"
                        className={authRowInputClass}
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="foleio-auth-row">
                      <Lock className="foleio-auth-row-icon h-4 w-4" />
                      <input
                        type="password"
                        placeholder="Password"
                        className={authRowInputClass}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                  <div className="mt-1.5 flex justify-end">
                    <Link href="/forgot-password" className={`${authLinkClass} text-xs`}>
                      Forgot password?
                    </Link>
                  </div>
                </FormItem>
              )}
            />
            <button
              type="submit"
              className={authButtonClass}
              disabled={isLoading || redirecting}
            >
              {isLoading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </Form>
      </AuthLumaLayout>
    </>
  );
}
