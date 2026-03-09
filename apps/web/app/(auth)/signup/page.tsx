'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Mail } from 'lucide-react';
import { isPilotEmail } from '@/lib/config/pilot';

const signupSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

function ResendVerificationButton({ email }: { email: string }) {
  const supabase = createClient();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function handleResend() {
    setLoading(true);
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
      },
    });
    setSent(true);
    setLoading(false);
    setCooldown(60);
    const timer = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setSent(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleResend()}
      disabled={loading || cooldown > 0}
      className="text-sm font-semibold text-primary underline underline-offset-2 disabled:no-underline disabled:opacity-50"
    >
      {loading ? 'Sending...' : sent ? `Resend in ${cooldown}s` : 'Resend verification email'}
    </button>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const supabase = createClient();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    },
  });

  async function onSubmit(data: SignupFormValues) {
    const normalizedEmail = data.email.trim().toLowerCase();
    if (!isPilotEmail(normalizedEmail)) {
      toast({
        title: 'Pilot access only',
        description:
          'Signups are currently limited to approved pilot emails.',
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
      const emailExistsData = await emailExistsRes.json().catch(() => ({ exists: false }));
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
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
          data: {
            full_name: data.fullName,
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information to create your Foleio account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {verificationSent ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 font-display text-2xl font-bold">Check your inbox</h2>
            <p className="mb-2 text-sm text-muted-foreground">We sent a verification link to:</p>
            <p className="mb-6 font-semibold text-foreground">{signupEmail}</p>
            <p className="mb-6 text-sm text-muted-foreground">
              Click the link in the email to activate your account and get started.
            </p>
            <ResendVerificationButton email={signupEmail} />
            <p className="mt-4 text-xs text-muted-foreground">
              Wrong email?{' '}
              <button
                type="button"
                onClick={() => setVerificationSent(false)}
                className="text-primary underline underline-offset-2"
              >
                Go back
              </button>
            </p>
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                    />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
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
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Sign up'}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </form>
        </Form>
        )}
      </CardContent>
    </Card>
  );
}

