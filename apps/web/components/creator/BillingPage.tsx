'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Check, Minus } from 'lucide-react';

type PlanKey = 'starter' | 'pro' | 'premium';

type SubscriptionRecord = {
  id: string;
  plan: string;
  amount: number;
  status: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
};

type BillingPageProps = {
  creator: {
    id: string;
    displayName: string;
  };
  currentSubscription: SubscriptionRecord | null;
  billingHistory: SubscriptionRecord[];
};

const PLAN_COPY: Record<
  PlanKey,
  {
    title: string;
    price: string;
    cta: string;
    features: { label: string; included: boolean }[];
  }
> = {
  starter: {
    title: 'Starter',
    price: 'Free',
    cta: 'Current Plan',
    features: [
      { label: 'Up to 5 content uploads', included: true },
      { label: '1 fan subscription plan', included: true },
      { label: 'Up to 10 bookings/month', included: true },
      { label: '8% transaction fee', included: true },
      { label: 'Foleio branding on profile', included: true },
      { label: 'No collections or courses', included: false },
      { label: 'No analytics', included: false },
    ],
  },
  pro: {
    title: 'Pro',
    price: 'N8,000/month (3-day free trial)',
    cta: 'Upgrade to Pro',
    features: [
      { label: 'Unlimited content uploads', included: true },
      { label: 'Up to 3 fan subscription plans', included: true },
      { label: 'Unlimited bookings', included: true },
      { label: 'Collections & courses', included: true },
      { label: '5% transaction fee', included: true },
      { label: 'Remove Foleio branding', included: true },
      { label: 'Basic analytics (views, earnings)', included: true },
      { label: 'Priority support', included: true },
    ],
  },
  premium: {
    title: 'Premium',
    price: 'N15,000/month',
    cta: 'Upgrade to Premium',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Unlimited fan subscription plans', included: true },
      { label: '3% transaction fee', included: true },
      {
        label:
          'Advanced analytics (subscriber growth, revenue trends, top content)',
        included: true,
      },
      { label: 'Early access to new features', included: true },
      { label: 'Dedicated support', included: true },
    ],
  },
};

const STATUS_STYLE: Record<string, string> = {
  active: 'default',
  trialing: 'secondary',
  cancelled: 'outline',
  canceled: 'outline',
  past_due: 'destructive',
};

function formatPlan(plan: string) {
  return plan.toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
}

function parsePlan(plan: string | null | undefined): PlanKey {
  if (plan === 'pro' || plan === 'premium') {
    return plan;
  }
  return 'starter';
}

export function BillingPage({
  creator,
  currentSubscription,
  billingHistory,
}: BillingPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [upgradeTarget, setUpgradeTarget] = useState<PlanKey | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPlan = parsePlan(currentSubscription?.plan);
  const isPaidPlan = currentPlan === 'pro' || currentPlan === 'premium';
  const currentStatus = currentSubscription?.status || 'active';
  const periodEnd = currentSubscription?.currentPeriodEnd || null;
  const trialDaysLeft = useMemo(() => {
    if (currentStatus !== 'trialing' || !periodEnd) {
      return null;
    }
    const ms = new Date(periodEnd).getTime() - Date.now();
    const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    return days;
  }, [currentStatus, periodEnd]);

  const showTrialNote = currentStatus === 'trialing' && trialDaysLeft !== null;

  useEffect(() => {
    const upgraded = searchParams.get('upgraded');
    if (upgraded !== 'true') {
      return;
    }

    toast({
      title: `🎉 Welcome to Foleio ${formatPlan(currentPlan)}!`,
      description: 'Your subscription is now active.',
    });

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('upgraded');
    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;
    router.replace(nextUrl);
  }, [searchParams, pathname, router, toast, currentPlan]);

  useEffect(() => {
    const upgrade = searchParams.get('upgrade');
    if (upgrade !== 'pro' && upgrade !== 'premium') {
      return;
    }

    setUpgradeTarget(upgrade);
    const params = new URLSearchParams(window.location.search);
    params.delete('upgrade');
    const nextQuery = params.toString();
    window.history.replaceState({}, '', nextQuery ? `/billing?${nextQuery}` : '/billing');
  }, [searchParams]);

  async function handleUpgrade(plan: PlanKey) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Upgrade failed');
      }

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }

      throw new Error('Missing authorization URL from billing upgrade.');
    } catch (error: any) {
      toast({
        title: 'Upgrade failed',
        description: error?.message || 'Could not process upgrade.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Cancellation failed');
      }

      toast({
        title: 'Subscription cancelled',
        description: 'Your subscription will not renew after this billing cycle.',
      });
      setCancelOpen(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Cancellation failed',
        description: error?.message || 'Could not cancel subscription.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 bg-[#FFFBF5] p-1 font-sans">
      <div>
        <h1 className="font-display text-3xl text-foreground">Billing</h1>
        <p className="text-muted-foreground">
          Manage your Foleio platform subscription, {creator.displayName}.
        </p>
      </div>

      <Card className="rounded-2xl border-orange-200 bg-[#FFF7ED] shadow-lg shadow-orange-100/40">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-orange-600 px-3 py-1 text-sm text-white">
              {formatPlan(currentPlan)}
            </Badge>
            <Badge variant={STATUS_STYLE[currentStatus] as any}>
              {currentStatus === 'trialing'
                ? `Trial (${trialDaysLeft ?? 0} day${(trialDaysLeft ?? 0) === 1 ? '' : 's'} left)`
                : currentStatus === 'past_due'
                  ? 'Past Due'
                  : currentStatus === 'cancelled' || currentStatus === 'canceled'
                    ? 'Cancelled'
                    : 'Active'}
            </Badge>
          </div>
          <CardTitle className="font-display text-2xl">
            Current Plan Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showTrialNote ? (
            <p className="rounded-md bg-amber-100 px-3 py-2 text-amber-900">
              Your 3-day free trial ends in {trialDaysLeft} day
              {trialDaysLeft === 1 ? '' : 's'}.
            </p>
          ) : null}

          {currentPlan === 'starter' ? (
            <p className="text-muted-foreground">You're on the free plan.</p>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Current period end:{' '}
            <span className="font-medium text-foreground">{formatDate(periodEnd)}</span>
          </p>

          <div className="flex flex-wrap gap-3">
            <a href="#plan-comparison">
              <Button className="bg-orange-600 text-white hover:bg-orange-700">
                Upgrade Plan
              </Button>
            </a>
            {isPaidPlan ? (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                Cancel Subscription
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <section id="plan-comparison" className="space-y-4">
        <h2 className="font-display text-2xl text-foreground">Plan Comparison</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(PLAN_COPY) as PlanKey[]).map((plan) => {
            const copy = PLAN_COPY[plan];
            const isCurrent = plan === currentPlan;
            const canUpgrade =
              (currentPlan === 'starter' && (plan === 'pro' || plan === 'premium')) ||
              (currentPlan === 'pro' && plan === 'premium');

            return (
              <Card
                key={plan}
                className={`rounded-2xl shadow-md ${
                  isCurrent ? 'border-2 border-orange-500' : 'border-border/70'
                }`}
              >
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="font-display text-2xl">{copy.title}</CardTitle>
                    {isCurrent ? (
                      <Badge className="bg-orange-600 text-white">Current Plan</Badge>
                    ) : null}
                    {plan === 'pro' ? (
                      <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                    ) : null}
                  </div>
                  <p className="font-medium text-foreground">{copy.price}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {copy.features.map((feature) => (
                    <div key={feature.label} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <Check className="mt-0.5 h-4 w-4 text-green-600" />
                      ) : (
                        <Minus className="mt-0.5 h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-muted-foreground">{feature.label}</span>
                    </div>
                  ))}

                  <Button
                    className={`mt-4 w-full ${
                      isCurrent
                        ? 'cursor-not-allowed bg-gray-200 text-gray-500 hover:bg-gray-200'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                    disabled={isCurrent || !canUpgrade}
                    onClick={() => setUpgradeTarget(plan)}
                  >
                    {isCurrent ? 'Current Plan' : copy.cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-foreground">Billing History</h2>
        <Card className="rounded-2xl shadow-md">
          <CardContent className="pt-6">
            {billingHistory.length === 0 ? (
              <p className="text-muted-foreground">No billing history yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2 font-medium">Plan</th>
                      <th className="py-2 font-medium">Amount</th>
                      <th className="py-2 font-medium">Status</th>
                      <th className="py-2 font-medium">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="py-3">{formatDate(entry.createdAt)}</td>
                        <td className="py-3">{formatPlan(entry.plan)}</td>
                        <td className="py-3">
                          {entry.amount > 0
                            ? new Intl.NumberFormat('en-NG', {
                                style: 'currency',
                                currency: 'NGN',
                              }).format(entry.amount / 100)
                            : 'Free'}
                        </td>
                        <td className="py-3 capitalize">{entry.status.replace('_', ' ')}</td>
                        <td className="py-3">
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {upgradeTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#FFF7ED] p-6 shadow-2xl">
            <h3 className="font-display text-2xl text-foreground">
              Upgrade to {PLAN_COPY[upgradeTarget].title}
            </h3>
            <p className="mt-2 text-muted-foreground">{PLAN_COPY[upgradeTarget].price}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {upgradeTarget === 'pro' && currentPlan === 'starter'
                ? "You'll unlock unlimited uploads, collections, reduced fees, and priority support."
                : 'You are upgrading to unlock more powerful creator features and lower fees.'}
            </p>
            {upgradeTarget === 'pro' && currentPlan === 'starter' ? (
              <p className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900">
                You won't be charged until your trial ends.
              </p>
            ) : null}

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setUpgradeTarget(null)}
              >
                Not now
              </Button>
              <Button
                className="flex-1 bg-orange-600 text-white hover:bg-orange-700"
                disabled={isSubmitting}
                onClick={() => handleUpgrade(upgradeTarget)}
              >
                {isSubmitting
                  ? 'Processing...'
                  : upgradeTarget === 'pro' && currentPlan === 'starter'
                    ? 'Start 3-day free trial'
                    : 'Upgrade now'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-2xl text-foreground">
              Are you sure you want to cancel?
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Your plan stays active until {formatDate(periodEnd)}. After that
              you'll move to Starter.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCancelOpen(false)}>
                Keep my plan
              </Button>
              <Button
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
                disabled={isSubmitting}
                onClick={handleCancel}
              >
                {isSubmitting ? 'Cancelling...' : 'Cancel subscription'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
