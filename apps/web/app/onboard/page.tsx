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

const step1Schema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  bio: z.string().optional(),
  category: z.string().default('makeup'),
  instagramHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
});

const step2Schema = z.object({
  bankCode: z.string().min(1, 'Bank code is required'),
  accountNumber: z.string().min(10, 'Account number must be at least 10 digits'),
  accountName: z.string().min(2, 'Account name is required'),
  bvn: z.string().length(11, 'BVN must be 11 digits').optional(),
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

const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank (Diamond)' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '526', name: 'Parallex Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank For Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
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
      bankCode: '',
      accountNumber: '',
      accountName: '',
      bvn: '',
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

  async function handleStep2Submit(data: z.infer<typeof step2Schema>) {
    setFormData((prev) => ({ ...prev, step2: data }));
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
              {step === 2 && 'Bank Details'}
              {step === 3 && 'Subscription Plan'}
              {step === 4 && 'Platform Subscription'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Tell us about your business'}
              {step === 2 && 'Add your bank account for payouts'}
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
                          <SelectItem value="makeup">Makeup</SelectItem>
                          <SelectItem value="fashion">Fashion</SelectItem>
                          <SelectItem value="fitness">Fitness</SelectItem>
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="lifestyle">Lifestyle</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
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
                  onSubmit={step2Form.handleSubmit(handleStep2Submit)}
                  className="space-y-4"
                >
                <FormField
                  control={step2Form.control}
                  name="bankCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NIGERIAN_BANKS.map((bank) => (
                            <SelectItem key={bank.code} value={bank.code}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={step2Form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="0123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={step2Form.control}
                  name="accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={step2Form.control}
                  name="bvn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BVN (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678901" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                    Next
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
      <OnboardingAssistant />
    </>
  );
}

