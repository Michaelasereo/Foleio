'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type PlanKey = 'free' | 'pro';

type SubscriptionRecord = {
  id: string;
  plan: string;
  amount: number;
  status: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
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
  /** When true, omit the page h1 (Settings tab already has chrome). */
  embedded?: boolean;
};

const PLAN_COPY: Record<
  PlanKey,
  {
    title: string;
    price: string;
    cta: string;
    features: string[];
  }
> = {
  free: {
    title: 'Free',
    price: '₦0',
    cta: 'Current plan',
    features: [
      'Full access to bookings, services, and tools',
      '5% Foleio fee per booking (₦300 flat under ₦5,000)',
      'Paystack processing fees still apply',
    ],
  },
  pro: {
    title: 'Pro',
    price: '₦10,000/month',
    cta: 'Upgrade to Pro',
    features: [
      'Everything on Free',
      '0% Foleio fee on bookings',
      'Only Paystack processing fees apply',
    ],
  },
};

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
}

function parseActivePlan(sub: SubscriptionRecord | null): PlanKey {
  if (!sub) return 'free';
  const plan = sub.plan?.toLowerCase();
  const status = sub.status?.toLowerCase();
  const paid =
    (plan === 'pro' || plan === 'premium') &&
    (status === 'active' || status === 'trialing');
  return paid ? 'pro' : 'free';
}

export function BillingPage({
  creator,
  currentSubscription,
  billingHistory,
  embedded = false,
}: BillingPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const verifyAttemptRef = useRef<string | null>(null);

  const currentPlan = parseActivePlan(currentSubscription);
  const isPaidPlan = currentPlan === 'pro';
  const currentStatus = currentSubscription?.status || 'active';
  const periodEnd = currentSubscription?.currentPeriodEnd || null;
  const cancelAtPeriodEnd = Boolean(currentSubscription?.cancelAtPeriodEnd);

  useEffect(() => {
    const upgraded = searchParams.get('upgraded');
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (upgraded !== 'true' && !reference) return;

    const attemptKey = reference || 'upgraded';
    if (verifyAttemptRef.current === attemptKey) return;
    verifyAttemptRef.current = attemptKey;

    let cancelled = false;

    const clearCallbackParams = () => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete('upgraded');
      nextParams.delete('reference');
      nextParams.delete('trxref');
      if (!nextParams.get('tab')) nextParams.set('tab', 'billing');
      const q = nextParams.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    };

    (async () => {
      if (reference) {
        try {
          const response = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference }),
          });
          const data = await response.json().catch(() => ({}));
          if (cancelled) return;

          if (!response.ok) {
            toast({
              title: 'Could not confirm Pro upgrade',
              description:
                data?.error ||
                'Payment may still be processing. Refresh this page in a moment.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Welcome to Foleio Pro',
              description:
                'Your subscription is active. Platform booking fees are now 0%.',
            });
          }
        } catch {
          if (cancelled) return;
          toast({
            title: 'Could not confirm Pro upgrade',
            description: 'Check your connection and refresh billing.',
            variant: 'destructive',
          });
        }
      } else if (upgraded === 'true') {
        toast({
          title: 'Payment received',
          description: 'Confirming your Pro plan…',
        });
      }

      if (cancelled) return;
      clearCallbackParams();
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname, router, toast]);

  useEffect(() => {
    const upgrade = searchParams.get('upgrade');
    if (upgrade !== 'pro') return;
    setUpgradeOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('upgrade');
    if (!params.get('tab') && pathname.includes('/settings')) {
      params.set('tab', 'billing');
    }
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  async function handleUpgrade() {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
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
    } catch (error: unknown) {
      toast({
        title: 'Upgrade failed',
        description: error instanceof Error ? error.message : 'Could not process upgrade.',
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
        description: 'Pro stays active until the end of this billing cycle, then Free (5% fee) resumes.',
      });
      setCancelOpen(false);
      router.refresh();
    } catch (error: unknown) {
      toast({
        title: 'Cancellation failed',
        description:
          error instanceof Error ? error.message : 'Could not cancel subscription.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {!embedded ? (
        <div className="foleio-dash-header">
          <div>
            <h1 className="foleio-auth-title">Billing</h1>
            <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
              Manage your Foleio plan, {creator.displayName}.
            </p>
          </div>
        </div>
      ) : null}

      <div className="foleio-dash-panel">
        <h2 className="foleio-dash-panel-title">Current plan</h2>
        <p className="foleio-dash-panel-meta">
          {currentPlan === 'pro'
            ? cancelAtPeriodEnd
              ? `Pro — cancels on ${formatDate(periodEnd)}. After that, Free (5% fee).`
              : `Pro — 0% Foleio booking fee. Renews around ${formatDate(periodEnd)}.`
            : 'Free — full access with a 5% Foleio fee per booking (₦300 flat under ₦5,000).'}
        </p>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8, textTransform: 'capitalize' }}>
          Status: {currentStatus.replace(/_/g, ' ')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {currentPlan === 'free' ? (
            <button
              type="button"
              className="foleio-dash-btn-primary"
              onClick={() => setUpgradeOpen(true)}
            >
              Upgrade to Pro
            </button>
          ) : (
            <button
              type="button"
              className="foleio-dash-btn-outline"
              onClick={() => setCancelOpen(true)}
              disabled={cancelAtPeriodEnd}
            >
              {cancelAtPeriodEnd ? 'Cancellation scheduled' : 'Cancel subscription'}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}
      >
        {(Object.keys(PLAN_COPY) as PlanKey[]).map((plan) => {
          const copy = PLAN_COPY[plan];
          const isCurrent = plan === currentPlan;
          return (
            <div
              key={plan}
              className="foleio-dash-panel"
              style={{
                border: isCurrent ? '1px solid rgba(250,250,250,0.28)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <h3 className="foleio-dash-panel-title">{copy.title}</h3>
                {isCurrent ? (
                  <span className="foleio-dash-badge is-success">Current</span>
                ) : null}
              </div>
              <p className="foleio-dash-panel-meta" style={{ marginTop: 4 }}>
                {copy.price}
              </p>
              <ul style={{ margin: '14px 0 0', padding: 0, listStyle: 'none' }}>
                {copy.features.map((feature) => (
                  <li
                    key={feature}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                      marginBottom: 8,
                      color: '#adadad',
                      fontSize: 13,
                    }}
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={
                  isCurrent || plan === 'free'
                    ? 'foleio-dash-btn-outline'
                    : 'foleio-dash-btn-primary'
                }
                style={{ width: '100%', marginTop: 12 }}
                disabled={isCurrent || plan === 'free'}
                onClick={() => {
                  if (plan === 'pro') setUpgradeOpen(true);
                }}
              >
                {isCurrent ? 'Current plan' : copy.cta}
              </button>
            </div>
          );
        })}
      </div>

      <div className="foleio-dash-panel">
        <h2 className="foleio-dash-panel-title">Billing history</h2>
        {billingHistory.length === 0 ? (
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0 }}>
            No billing history yet.
          </p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr style={{ color: '#828282' }}>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Plan</th>
                  <th className="py-2 font-medium">Amount</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.map((entry) => (
                  <tr key={entry.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td className="py-3">{formatDate(entry.createdAt)}</td>
                    <td className="py-3" style={{ textTransform: 'capitalize' }}>
                      {entry.plan === 'starter' ? 'Free' : entry.plan}
                    </td>
                    <td className="py-3">
                      {entry.amount > 0
                        ? new Intl.NumberFormat('en-NG', {
                            style: 'currency',
                            currency: 'NGN',
                          }).format(entry.amount / 100)
                        : 'Free'}
                    </td>
                    <td className="py-3 capitalize">{entry.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {upgradeOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: '#212121', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h3 className="foleio-dash-panel-title">Upgrade to Pro</h3>
            <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
              ₦10,000/month. Platform booking fees drop to 0% (Paystack fees still apply).
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="foleio-dash-btn-outline"
                style={{ flex: 1 }}
                onClick={() => setUpgradeOpen(false)}
              >
                Not now
              </button>
              <button
                type="button"
                className="foleio-dash-btn-primary"
                style={{ flex: 1 }}
                disabled={isSubmitting}
                onClick={() => void handleUpgrade()}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Processing…' : 'Upgrade now'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelOpen && isPaidPlan ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: '#212121', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h3 className="foleio-dash-panel-title">Cancel Pro?</h3>
            <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
              Your plan stays active until {formatDate(periodEnd)}. After that you move to Free
              and the 5% booking fee returns.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="foleio-dash-btn-outline"
                style={{ flex: 1 }}
                onClick={() => setCancelOpen(false)}
              >
                Keep Pro
              </button>
              <button
                type="button"
                className="foleio-dash-btn-danger"
                style={{ flex: 1 }}
                disabled={isSubmitting}
                onClick={() => void handleCancel()}
              >
                {isSubmitting ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
