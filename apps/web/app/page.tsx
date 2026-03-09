'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { isPilotEmail } from '@/lib/config/pilot';
import { WaitlistModal } from '@/components/WaitlistModal';
import foleioLogo from '../../../foleio-logo.png';
import { Mail } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

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

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

function SignInForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
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

      router.push('/dashboard');
      router.refresh();
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        <div className="flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-sm text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </Form>
  );
}

function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
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
      setWaitlistName(data.fullName);
      setWaitlistEmail(normalizedEmail);
      setIsWaitlistOpen(true);
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

  async function handleResendVerification() {
    if (!signupEmail || resendCooldown > 0) return;
    setResendLoading(true);
    await supabase.auth.resend({
      type: 'signup',
      email: signupEmail,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
      },
    });
    setResendLoading(false);
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  return (
    <>
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
          <button
            type="button"
            onClick={() => void handleResendVerification()}
            disabled={resendLoading || resendCooldown > 0}
            className="text-sm font-semibold text-primary underline underline-offset-2 disabled:no-underline disabled:opacity-50"
          >
            {resendLoading
              ? 'Sending...'
              : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend verification email'}
          </button>
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
        </form>
      </Form>
      )}

      <WaitlistModal
        open={isWaitlistOpen}
        onOpenChange={setIsWaitlistOpen}
        initialName={waitlistName}
        initialEmail={waitlistEmail}
      />
    </>
  );
}

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-16 h-48 w-48 rounded-full bg-primary/10 blur-xl" />
        <div className="absolute left-1/3 top-1/4 h-20 w-20 rotate-12 rounded-2xl bg-accent/10" />
        <div className="absolute bottom-16 left-20 h-16 w-16 rounded-md bg-primary/15" />
        <div className="absolute right-10 top-20 h-28 w-28 rounded-full border border-accent/20" />
        <div className="absolute bottom-24 right-1/4 h-24 w-24 -rotate-12 rounded-3xl bg-secondary/10" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-10 px-6 py-10 md:px-10 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-16">
        <section className="space-y-8">
          <div className="inline-flex items-center">
            <Image
              src={foleioLogo}
              alt="Foleio"
              className="h-20 w-auto sm:h-24"
              priority
            />
          </div>

          <div className="space-y-5">
            <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Your work. Your world. Your Foleio.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              The creative portfolio platform built for Nigerian creators.
              Monetize content, offer services, and build your world - all in
              one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-border/70 bg-card/80 px-4 py-2 text-foreground">
              📹 Sell Content
            </span>
            <span className="rounded-full border border-border/70 bg-card/80 px-4 py-2 text-foreground">
              📅 Book Services
            </span>
            <span className="rounded-full border border-border/70 bg-card/80 px-4 py-2 text-foreground">
              💰 Get Paid in Naira
            </span>
          </div>
        </section>

        <section className="w-full">
          <Card className="border-border/70 bg-card/95 shadow-2xl backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-3xl text-foreground">
                Join Foleio
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Create your portfolio world and start earning in minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="mb-5 grid w-full grid-cols-2 bg-muted/70">
                  <TabsTrigger
                    value="signin"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="mt-0">
                  <SignInForm />
                </TabsContent>
                <TabsContent value="signup" className="mt-0">
                  <SignUpForm />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

