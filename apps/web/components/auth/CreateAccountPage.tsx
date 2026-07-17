'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2, Lock, Mail, User, CircleUser, Eye, EyeOff } from 'lucide-react';
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
    acceptTerms: z.boolean().refine((value) => value === true, {
      message: 'You must accept the Terms & Conditions to continue',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function CreateAccountPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteRequested, setInviteRequested] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  async function onSubmit(data: SignupFormValues) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const username = normalizeUsername(data.username);

    setIsLoading(true);
    try {
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: data.password,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          username,
        }),
      });
      const signupData = (await signupRes.json().catch(() => ({}))) as {
        error?: string;
        pendingInvite?: boolean;
      };

      if (!signupRes.ok) {
        toast({
          title: signupRes.status === 409 ? 'Already requested' : 'Request failed',
          description:
            signupData.error ||
            'Could not submit your invite request. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      setRequestEmail(normalizedEmail);
      setInviteRequested(true);
      toast({
        title: 'Invite requested',
        description: 'We’ll email a verification code when you’re approved.',
      });
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

  if (inviteRequested) {
    return (
      <AuthLumaLayout
        title="You’re on the list"
        footerExtra={
          <p className={authMutedClass}>
            Already approved?{' '}
            <Link href="/login" className={authLinkClass}>
              Login
            </Link>
          </p>
        }
      >
        <div className="foleio-auth-form-stack" style={{ gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              color: '#86efac',
            }}
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: '#fafafa' }}>
                Request received for {requestEmail}
              </p>
              <p className={authMutedClass} style={{ marginTop: 8 }}>
                We’ll email a verification code and link when an admin approves your
                invite. Use the password you just chose to log in after that.
              </p>
            </div>
          </div>
          <Link href="/login" className={authButtonClass} style={{ textAlign: 'center' }}>
            Go to login
          </Link>
        </div>
      </AuthLumaLayout>
    );
  }

  return (
    <AuthLumaLayout
      title="Creator, manage your business on Foleio"
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
                      <CircleUser className="foleio-auth-row-icon h-5 w-5" strokeWidth={1.5} />
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
                      <CircleUser className="foleio-auth-row-icon h-5 w-5" strokeWidth={1.5} />
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
                  <div className="foleio-auth-row">
                    <User className="foleio-auth-row-icon h-5 w-5" strokeWidth={1.5} />
                    <input
                      placeholder="Business username  e.g Shosglam"
                      className={authRowInputClass}
                      autoComplete="username"
                      {...field}
                    />
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

          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="foleio-auth-terms">
                    <input
                      id="accept-terms"
                      type="checkbox"
                      className="foleio-auth-terms-check"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                    <label htmlFor="accept-terms" className="foleio-auth-terms-label">
                      I accept the{' '}
                      <Link href="/legal/terms" target="_blank" rel="noopener noreferrer">
                        Terms &amp; Conditions
                      </Link>
                      ,{' '}
                      <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer">
                        Privacy Policy
                      </Link>
                      , and{' '}
                      <Link
                        href="/legal/creator-agreement"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Creator Agreement
                      </Link>{' '}
                      of Foleio.
                    </label>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <button type="submit" className={authButtonClass} disabled={isLoading}>
            {isLoading ? 'Submitting…' : 'Request invite'}
          </button>
        </form>
      </Form>
    </AuthLumaLayout>
  );
}
