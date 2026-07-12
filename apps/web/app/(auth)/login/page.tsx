'use client';

import { useEffect, useState } from 'react';
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
import { Lock, Mail } from 'lucide-react';
import { AuthLumaLayout } from '@/components/auth/AuthLumaLayout';
import { AuthRedirectOverlay } from '@/components/auth/AuthRedirectOverlay';
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

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!redirecting) return;
    const timer = window.setTimeout(() => {
      setRedirecting(false);
      setIsLoading(false);
      toast({
        title: 'Dashboard is taking longer than expected',
        description: 'You can retry login in a moment if this persists.',
        variant: 'destructive',
      });
    }, 15000);
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
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
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
      await new Promise((resolve) => setTimeout(resolve, 300));
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
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
            <Link href="/" className={authLinkClass}>
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
