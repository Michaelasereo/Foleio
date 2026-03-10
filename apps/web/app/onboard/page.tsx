'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCreatorProfile } from '@/lib/actions/creator';
import { useFormPersistence, formPersistence } from '@/lib/forms/form-persistence';
import { useErrorHandler } from '@/lib/errors/error-handler';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { OnboardingAssistant } from '@/components/ai/OnboardingAssistant';
import { INDUSTRY_OPTIONS } from '@/lib/constants/industries';

const step1Schema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  bio: z.string().optional(),
  category: z.string().default('makeup'),
  instagramHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
});

const step2Schema = z.object({
  skipBankSetup: z.boolean().default(true),
});

const step3Schema = z.object({
  planName: z.string().min(2, 'Plan name is required'),
  planPrice: z.number().min(1000, 'Minimum price is ₦10'),
  planDescription: z.string().optional(),
  planFeatures: z.array(z.string()).default([]),
});

const step4Schema = z.object({
  platformPlan: z.enum(['starter', 'pro', 'premium']).default('starter'),
});

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  type OnboardingFormData = {
    step1: z.infer<typeof step1Schema>;
    step2: z.infer<typeof step2Schema>;
    step3: z.infer<typeof step3Schema>;
    step4: z.infer<typeof step4Schema>;
  };
  type OnboardingPersistedData = {
    formData: OnboardingFormData;
    step: number;
    timestamp: number;
  };
  const { saveFormData, loadFormData, clearFormData, hasPersistedData } =
    useFormPersistence<OnboardingPersistedData>('creator-onboarding');

  const [formData, setFormData] = useState({
    step1: {} as z.infer<typeof step1Schema>,
    step2: {} as z.infer<typeof step2Schema>,
    step3: {} as z.infer<typeof step3Schema>,
    step4: {} as z.infer<typeof step4Schema>,
  });

  // Load persisted data on component mount
  useEffect(() => {
    async function validateOnboardingAccess() {
      try {
        const response = await fetch('/api/auth/onboarding-status', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          router.replace('/login');
          return;
        }

        const data: {
          authenticated?: boolean;
          hasCompletedOnboarding?: boolean;
        } = await response.json();

        if (!data.authenticated) {
          router.replace('/login');
          return;
        }

        if (data.hasCompletedOnboarding) {
          router.replace('/dashboard');
          return;
        }
      } catch {
        router.replace('/login');
        return;
      } finally {
        setIsCheckingAccess(false);
      }
    }

    void validateOnboardingAccess();

    const persistedData = loadFormData();
    if (persistedData) {
      setFormData(persistedData.formData || formData);
      setStep(persistedData.step || 1);
      setRestoredFromStorage(true);

      toast({
        title: 'Progress Restored',
        description: 'Your previous onboarding progress has been restored.',
      });
    }
  }, []);

  // Save form state whenever it changes
  useEffect(() => {
    if (restoredFromStorage || Object.values(formData).some(step => Object.keys(step).length > 0)) {
      saveFormData({
        formData,
        step,
        timestamp: Date.now(),
      });
    }
  }, [formData, step, restoredFromStorage]);

  const step1Form = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      displayName: '',
      bio: '',
      category: 'makeup',
      instagramHandle: '',
      tiktokHandle: '',
    },
  });

  const step2Form = useForm<z.infer<typeof step2Schema>>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      skipBankSetup: true,
    },
  });

  const step3Form = useForm<z.infer<typeof step3Schema>>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      planName: 'Basic Plan',
      planPrice: 5000,
      planDescription: '',
    },
  });

  const step4Form = useForm<z.infer<typeof step4Schema>>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      platformPlan: 'starter',
    },
  });

  async function handleStep1Submit(data: z.infer<typeof step1Schema>) {
    setFormData((prev) => ({ ...prev, step1: data }));
    setStep(2);
  }

  async function handleStep2Submit() {
    setFormData((prev) => ({ ...prev, step2: { skipBankSetup: true } }));
    setStep(3);
  }

  async function handleStep3Submit(data: z.infer<typeof step3Schema>) {
    setFormData((prev) => ({ ...prev, step3: data }));
    setStep(4);
  }

  async function handleStep4Submit(data: z.infer<typeof step4Schema>) {
    setIsLoading(true);
    try {
      const result: any = await createCreatorProfile(
        formData.step1,
        formData.step2,
        formData.step3,
        data
      );

      if (!result || result.success !== true) {
        const rawError =
          typeof result?.error === 'string'
            ? result.error
            : result?.error
              ? (() => {
                  try {
                    const serialized = JSON.stringify(result.error);
                    return serialized && serialized !== '{}'
                      ? serialized
                      : 'Failed to complete setup';
                  } catch {
                    return 'Failed to complete setup';
                  }
                })()
              : 'Failed to complete setup';
        const error = handleError(rawError, { operation: 'onboarding' });
        toast({
          title: error.title,
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // Clear persisted form data on successful completion
      clearFormData();

      const completeResponse = await fetch('/api/creator/complete-onboarding', {
        method: 'POST',
      });

      if (!completeResponse.ok) {
        throw new Error('Failed to complete onboarding');
      }

      toast({
        title: 'Success',
        description: 'Creator profile created successfully!',
      });

      router.push('/dashboard');
    } catch (error) {
      const errorInfo = handleError(error, { operation: 'onboarding' });
      toast({
        title: errorInfo.title,
        description: errorInfo.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {isCheckingAccess ? (
        <div className="container mx-auto max-w-2xl py-12">
          <p className="text-sm text-muted-foreground">Checking your onboarding access...</p>
        </div>
      ) : null}
      {!isCheckingAccess ? (
      <div className="container mx-auto max-w-2xl py-12">
        <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Foleio!</h1>
        <p className="text-muted-foreground">
          Let's set up your creator profile in a few simple steps
        </p>
        <Progress value={(step / 4) * 100} className="mt-4" />

        {restoredFromStorage && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              📁 Previous progress restored from your browser
            </p>
          </div>
        )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Step {step}:{' '}
              {step === 1 && 'Business Information'}
              {step === 2 && 'Payout Account (Optional)'}
              {step === 3 && 'Subscription Plan'}
              {step === 4 && 'Platform Subscription'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Tell us about your business'}
              {step === 2 && 'You can set up payouts later from Earnings'}
              {step === 3 && 'Create your first subscription plan'}
              {step === 4 && 'Choose your platform plan'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <Form {...step1Form}>
                <form
                  onSubmit={step1Form.handleSubmit(handleStep1Submit)}
                  className="space-y-4"
                >
                <FormField
                  control={step1Form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Business Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={step1Form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about your business..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={step1Form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDUSTRY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={step1Form.control}
                  name="instagramHandle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram Handle (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="@username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={step1Form.control}
                  name="tiktokHandle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TikTok Handle (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="@username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Next
                </Button>
                </form>
              </Form>
            )}

            {step === 2 && (
              <Form {...step2Form}>
                <form
                  onSubmit={step2Form.handleSubmit(() => handleStep2Submit())}
                  className="space-y-4"
                >
                <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">Payout Account</h3>
                      <p className="text-sm text-muted-foreground">
                        You can add your bank account later from the Earnings page.
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      Optional
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-full py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Skip for now →
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="w-full"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="w-full">
                    Continue
                  </Button>
                </div>
                </form>
              </Form>
            )}

            {step === 3 && (
              <Form {...step3Form}>
                <form
                  onSubmit={step3Form.handleSubmit(handleStep3Submit)}
                  className="space-y-4"
                >
                <FormField
                  control={step3Form.control}
                  name="planName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Basic Plan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={step3Form.control}
                  name="planPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Price (₦)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5000"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={step3Form.control}
                  name="planDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What subscribers get..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="w-full"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="w-full">
                    Next
                  </Button>
                </div>
                </form>
              </Form>
            )}

            {step === 4 && (
              <Form {...step4Form}>
                <form
                  onSubmit={step4Form.handleSubmit(handleStep4Submit)}
                  className="space-y-4"
                >
                <FormField
                  control={step4Form.control}
                  name="platformPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform Plan</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="starter">
                            Starter - Free (30-day trial)
                          </SelectItem>
                          <SelectItem value="pro">Pro - ₦5,000/month</SelectItem>
                          <SelectItem value="premium">
                            Premium - ₦15,000/month
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(3)}
                    className="w-full"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Complete Setup'}
                  </Button>
                </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
      ) : null}
      <OnboardingAssistant />
    </>
  );
}

