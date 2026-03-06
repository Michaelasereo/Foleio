'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import { getCreatorPlan, getPlanLimits, type PlatformPlan } from '@/lib/utils/plan-limits';

const collectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  accessType: z.enum(['free', 'subscription', 'one_time']).default('subscription'),
  isPublished: z.boolean().default(false),
  price: z.number().optional(),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

export default function NewCollectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlatformPlan>('STARTER');
  const [isHardBlocked, setIsHardBlocked] = useState(false);
  const { isOpen, limitType, showUpgradeModal, closeUpgradeModal } = useUpgradeModal();

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      title: '',
      description: '',
      accessType: 'subscription',
      isPublished: false,
      price: undefined,
    },
  });

  const accessType = form.watch('accessType');

  useEffect(() => {
    async function checkLimits() {
      try {
        const response = await fetch('/api/creator/me');
        if (!response.ok) return;
        const data = await response.json();
        const plan = getCreatorPlan(data.platformPlan ?? null);
        const limits = getPlanLimits(data.platformPlan ?? null);
        setCurrentPlan(plan);
        if (!limits.canCreateCollections) {
          setIsHardBlocked(true);
          showUpgradeModal('canCreateCollections');
        }
      } catch (error) {
        console.error('Failed to load plan limits:', error);
      }
    }
    void checkLimits();
  }, []);

  async function onSubmit(data: CollectionFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          tags: [],
          requiredPlanId: undefined,
          thumbnailUrl: undefined,
        }),
      });

      if (response.status === 403) {
        const blockedData = await response.json();
        setIsHardBlocked(true);
        showUpgradeModal((blockedData.limitType || 'canCreateCollections') as any);
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create collection',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Collection created successfully!',
      });

      router.push(`/collections/${result.collection?.id}`);
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
    <div className="container mx-auto py-8 max-w-2xl">
      {isHardBlocked ? (
        <Card className="border-orange-200 bg-orange-50/60">
          <CardHeader>
            <CardTitle>Collections are locked on your current plan</CardTitle>
            <CardDescription>
              Upgrade to Pro or Premium to create courses and collections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => showUpgradeModal('canCreateCollections')} className="bg-orange-600 text-white hover:bg-orange-700">
              Upgrade to unlock collections
            </Button>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>Create New Collection</CardTitle>
          <CardDescription>
            Create a collection (course/playlist) to organize your content into sections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter collection title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter collection description (optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select access type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="one_time">One-time Payment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {accessType === 'one_time' && (
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₦)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Collection'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      )}

      {limitType ? (
        <UpgradeModal
          isOpen={isOpen}
          onClose={closeUpgradeModal}
          limitType={limitType}
          currentPlan={currentPlan}
        />
      ) : null}
    </div>
  );
}

