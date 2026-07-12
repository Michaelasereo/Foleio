'use client';

import { useState } from 'react';
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
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { MailCheck } from 'lucide-react';
import { AuthLumaLayout } from '@/components/auth/AuthLumaLayout';
import {
  authButtonClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMutedClass,
} from '@/components/auth/styles';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const supabase = createClient();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setIsSuccess(true);
      toast({
        title: 'Success',
        description: 'Password reset email sent! Check your inbox.',
      });
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

  if (isSuccess) {
    return (
      <AuthLumaLayout
        title="Check your email"
        subtitle="We've sent a password reset link to your inbox."
      >
        <div className="py-2 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <MailCheck className="h-7 w-7 text-white/80" />
          </div>
          <p className={`mb-6 text-sm ${authMutedClass}`}>
            Follow the link in the email to set a new password.
          </p>
          <Link href="/login" className={authButtonClass}>
            Back to login
          </Link>
        </div>
      </AuthLumaLayout>
    );
  }

  return (
    <AuthLumaLayout
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
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
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>Email</FormLabel>
                <FormControl>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className={authInputClass}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button type="submit" className={authButtonClass} disabled={isLoading}>
            {isLoading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </Form>
    </AuthLumaLayout>
  );
}
