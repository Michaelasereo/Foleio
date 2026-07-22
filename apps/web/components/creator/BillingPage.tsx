'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  LEGACY_PRO_MONTHLY_KOBO,
  PLATFORM_FEE_PERCENT,
  PLATFORM_PLAN_AMOUNTS_KOBO,
  formatFreeFeeLabel,
  formatPlanPrice,
  formatProFeeLabel,
  freePlanFeatureBullets,
  isLegacyZeroFeeSubscription,
  planCompareAtKobo,
  planDiscountPercent,
  proPlanFeatureBullets,
  type BillingInterval,
  type PaidPlatformPlan,
} from '@/lib/billing/platform-plans';

type PlanKey = 'free' | 'pro' | 'growth';

type SubscriptionRecord = {
  id: string;
  plan: string;
  amount: number;
  status: string;
  billingInterval?: string | null;
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
    growthEligible?: boolean;
  };
  currentSubscription: SubscriptionRecord | null;
  billingHistory: SubscriptionRecord[];
  embedded?: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
}

function parseActivePlan(sub: SubscriptionRecord | null): PlanKey {
  if (!sub) return 'free';
  const plan = sub.plan?.toLowerCase();
  const status = sub.status?.toLowerCase();
  const paid = status === 'active' || status === 'trialing';
  if (!paid) return 'free';
  if (plan === 'growth' || plan === 'premium') return 'growth';
  if (plan === 'pro') return 'pro';
  return 'free';
}

function feeLabelForPlan(plan: PlanKey, isLegacyZero: boolean): string {
  if (isLegacyZero) return `${PLATFORM_FEE_PERCENT.legacyPro}% platform & service fees (legacy)`;
  if (plan === 'growth') return `${PLATFORM_FEE_PERCENT.growth}% platform & service fees`;
  if (plan === 'pro') return `${formatProFeeLabel()} platform & service fees`;
  return `${formatFreeFeeLabel()} platform & service fees`;
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
  const [upgradeTarget, setUpgradeTarget] = useState<{
    plan: PaidPlatformPlan;
    interval: BillingInterval;
  } | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const verifyAttemptRef = useRef<string | null>(null);

  const currentPlan = parseActivePlan(currentSubscription);
  const isPaidPlan = currentPlan === 'pro' || currentPlan === 'growth';
  const isLegacyZero = Boolean(
    currentSubscription && isLegacyZeroFeeSubscription(currentSubscription)
  );
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
              title: 'Could not confirm upgrade',
              description:
                data?.error ||
                'Payment may still be processing. Refresh this page in a moment.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Welcome to Foleio Pro',
              description: `Your subscription is active. Platform fee is now ${formatProFeeLabel()}.`,
            });
          }
        } catch {
          if (cancelled) return;
          toast({
            title: 'Could not confirm upgrade',
            description: 'Check your connection and refresh billing.',
            variant: 'destructive',
          });
        }
      } else if (upgraded === 'true') {
        toast({
          title: 'Payment received',
          description: 'Confirming your plan…',
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

  async function handleUpgrade(plan: PaidPlatformPlan, interval: BillingInterval) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
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
      setUpgradeTarget(null);
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
        description: `You’re on Free now (${formatFreeFeeLabel()} platform fee). Pro features are locked.`,
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

  const plans: Array<{
    key: PlanKey;
    title: string;
    fee: string;
    features: string[];
  }> = [
    {
      key: 'free',
      title: 'Free',
      fee: formatFreeFeeLabel(),
      features: [
        `${formatFreeFeeLabel()} platform & service fees`,
        ...freePlanFeatureBullets(),
      ],
    },
    {
      key: 'pro',
      title: 'Pro',
      fee: formatProFeeLabel(),
      features: [
        'Everything on Free',
        `${formatProFeeLabel()} platform & service fees on transactions`,
        ...proPlanFeatureBullets().filter((f) => f !== 'Everything on Free'),
      ],
    },
  ];

  const intervalLabel =
    billingInterval === 'quarterly' ? 'Quarterly' : 'Monthly';

  function priceForPaidPlan(_plan: PaidPlatformPlan): string {
    return formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro[billingInterval]);
  }

  function renderPaidPrice(plan: PaidPlatformPlan) {
    const compareAt = planCompareAtKobo(plan, billingInterval);
    const discountPct = planDiscountPercent(plan, billingInterval);
    return (
      <div style={{ marginTop: 12 }}>
        <p
          className="foleio-dash-panel-meta"
          style={{
            marginBottom: 0,
            color: '#fafafa',
            fontWeight: 600,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          {compareAt && discountPct > 0 ? (
            <span
              style={{
                color: '#828282',
                fontWeight: 400,
                textDecoration: 'line-through',
              }}
            >
              {formatPlanPrice(compareAt)}
            </span>
          ) : null}
          <span>
            {priceForPaidPlan(plan)}
            <span style={{ fontWeight: 400, color: '#adadad' }}>
              {' '}
              / {intervalLabel.toLowerCase()}
            </span>
          </span>
          {discountPct > 0 ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#4ade80',
                background: 'rgba(74, 222, 128, 0.12)',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              Save {discountPct}%
            </span>
          ) : null}
        </p>
      </div>
    );
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

      {isLegacyZero ? (
        <div className="foleio-dash-panel">
          <h2 className="foleio-dash-panel-title">Legacy Pro rate</h2>
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0 }}>
            You are on the previous Pro plan ({formatPlanPrice(LEGACY_PRO_MONTHLY_KOBO)}
            /month) with <strong>0% platform &amp; service fees until {formatDate(periodEnd)}</strong>.
            After that you move to Free ({formatFreeFeeLabel()}) unless you
            renew on the new Pro ({formatProFeeLabel()}).
          </p>
        </div>
      ) : null}

      <div className="foleio-dash-panel">
        <h2 className="foleio-dash-panel-title">Current plan</h2>
        <p className="foleio-dash-panel-meta">
          {currentPlan === 'free'
            ? `Free — ${feeLabelForPlan('free', false)}.`
            : cancelAtPeriodEnd
              ? `${currentPlan === 'growth' ? 'Growth' : 'Pro'} — cancels on ${formatDate(periodEnd)}. After that, Free (${formatFreeFeeLabel()}).`
              : `${currentPlan === 'growth' ? 'Growth' : 'Pro'} — ${feeLabelForPlan(currentPlan, isLegacyZero)}. Renews around ${formatDate(periodEnd)}.`}
        </p>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8, textTransform: 'capitalize' }}>
          Status: {currentStatus.replace(/_/g, ' ')}
        </p>
        {isPaidPlan ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            <button
              type="button"
              className="foleio-dash-btn-outline"
              onClick={() => setCancelOpen(true)}
              disabled={cancelAtPeriodEnd}
            >
              {cancelAtPeriodEnd ? 'Cancellation scheduled' : 'Cancel plan'}
            </button>
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          const isPaidCard = plan.key === 'pro';
          const paidKey: PaidPlatformPlan = 'pro';
          const canUpgradePaid = !(isCurrent && !isLegacyZero);

          return (
            <div key={plan.key} className="foleio-dash-panel" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <h3 className="foleio-dash-panel-title">{plan.title}</h3>
                <span style={{ color: '#fafafa', fontWeight: 600 }}>{plan.fee}</span>
              </div>

              {isPaidCard ? (
                <>
                  <div
                    role="tablist"
                    aria-label={`${plan.title} billing interval`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 4,
                      marginTop: 12,
                      padding: 4,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {(
                      [
                        { id: 'monthly', label: 'Monthly' },
                        { id: 'quarterly', label: 'Quarterly' },
                      ] as const
                    ).map((tab) => {
                      const active = billingInterval === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          className={
                            active ? 'foleio-dash-btn-primary' : 'foleio-dash-btn-ghost'
                          }
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: 12,
                            borderRadius: 8,
                          }}
                          onClick={() => setBillingInterval(tab.id)}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                  {renderPaidPrice(paidKey)}
                </>
              ) : (
                <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 8 }}>
                  ₦0
                </p>
              )}

              <ul style={{ margin: '12px 0', paddingLeft: 18, color: '#adadad', fontSize: 13 }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ marginBottom: 6 }}>
                    <Check className="inline h-3.5 w-3.5" style={{ marginRight: 6 }} />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.key === 'free' ? (
                <button type="button" className="foleio-dash-btn-outline" style={{ width: '100%' }} disabled>
                  {isCurrent ? 'Current plan' : 'Included'}
                </button>
              ) : (
                <button
                  type="button"
                  className="foleio-dash-btn-primary"
                  style={{ width: '100%' }}
                  disabled={!canUpgradePaid}
                  onClick={() =>
                    setUpgradeTarget({ plan: paidKey, interval: billingInterval })
                  }
                >
                  {!canUpgradePaid
                    ? 'Current plan'
                    : `Upgrade to ${plan.title}`}
                </button>
              )}
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
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#828282]">
                  <th className="py-2 pr-4 font-medium">Plan</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.map((entry) => (
                  <tr key={entry.id} className="border-t border-white/5 text-[#adadad]">
                    <td className="py-3 pr-4 capitalize">
                      {entry.plan === 'starter' ? 'Free' : entry.plan}
                      {entry.billingInterval ? ` · ${entry.billingInterval}` : ''}
                    </td>
                    <td className="py-3 pr-4">
                      {entry.amount > 0 ? formatPlanPrice(entry.amount) : 'Free'}
                    </td>
                    <td className="py-3 capitalize">{entry.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {upgradeTarget ? (
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
              {formatPlanPrice(
                PLATFORM_PLAN_AMOUNTS_KOBO.pro[upgradeTarget.interval]
              )}{' '}
              / {upgradeTarget.interval === 'quarterly' ? 'quarter' : 'month'}.
              Platform &amp; service fees become {formatProFeeLabel()}.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="foleio-dash-btn-outline"
                style={{ flex: 1 }}
                onClick={() => setUpgradeTarget(null)}
              >
                Not now
              </button>
              <button
                type="button"
                className="foleio-dash-btn-primary"
                style={{ flex: 1 }}
                disabled={isSubmitting}
                onClick={() =>
                  void handleUpgrade(upgradeTarget.plan, upgradeTarget.interval)
                }
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Processing…' : 'Continue'}
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
            <h3 className="foleio-dash-panel-title">
              Cancel {currentPlan === 'growth' ? 'Growth' : 'Pro'}?
            </h3>
            <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
              You’ll move to Free immediately. Pro features lock and{' '}
              {formatFreeFeeLabel()} fees apply on new payments.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="foleio-dash-btn-outline"
                style={{ flex: 1 }}
                onClick={() => setCancelOpen(false)}
              >
                Keep plan
              </button>
              <button
                type="button"
                className="foleio-dash-btn-primary"
                style={{ flex: 1 }}
                disabled={isSubmitting}
                onClick={() => void handleCancel()}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
