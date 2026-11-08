'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLumaLayout } from '@/components/auth/AuthLumaLayout';
import {
  authButtonClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMutedClass,
} from '@/components/auth/styles';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function ensureRecoverySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session) {
        setHasSession(true);
        setCheckingSession(false);
        return;
      }

      // Older Supabase email links may land with tokens in the hash.
      if (typeof window !== 'undefined' && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!cancelled) {
            setHasSession(!error);
            setCheckingSession(false);
          }
          return;
        }
      }

      setHasSession(false);
      setCheckingSession(false);
    }

    void ensureRecoverySession();
    return () => {
      cancelled = true;
    };
  }, [supabase.auth]);

  async function onSubmit(data: ResetPasswordFormValues) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Password updated',
        description: 'You can sign in with your new password.',
      });
      router.replace('/login');
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

  if (checkingSession) {
    return (
      <AuthLumaLayout title="Reset password" subtitle="Confirming your reset link…">
        <p className={`text-center text-sm ${authMutedClass}`}>Please wait…</p>
      </AuthLumaLayout>
    );
  }

  if (!hasSession) {
    return (
      <AuthLumaLayout
        title="Link expired"
        subtitle="This password reset link is invalid or has expired."
      >
        <div className="space-y-4 text-center">
          <p className={`text-sm ${authMutedClass}`}>
            Request a new reset link and try again.
          </p>
          <Link href="/forgot-password" className={authButtonClass}>
            Request new link
          </Link>
          <p className={authMutedClass}>
            <Link href="/login" className={authLinkClass}>
              Back to login
            </Link>
          </p>
        </div>
      </AuthLumaLayout>
    );
  }

  return (
    <AuthLumaLayout
      title="Set new password"
      subtitle="Choose a new password for your account."
      footerExtra={
        <p className={authMutedClass}>
          <Link href="/login" className={authLinkClass}>
            Back to login
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>New password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      className={authInputClass}
                      autoComplete="new-password"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>Confirm password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      className={authInputClass}
                      autoComplete="new-password"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button type="submit" className={authButtonClass} disabled={isLoading}>
            {isLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </Form>
    </AuthLumaLayout>
  );
}
