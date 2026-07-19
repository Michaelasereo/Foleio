'use client';

import Link from 'next/link';
import { Check, Lock, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PLAN_LIMIT_MESSAGES,
  type PlatformPlan,
} from '@/lib/utils/plan-limits';
import { formatProFeeLabel } from '@/lib/billing/platform-plans';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: keyof typeof PLAN_LIMIT_MESSAGES;
  currentPlan: PlatformPlan;
}

type PlanCardInfo = {
  name: PlatformPlan;
  price: string;
  slug: 'pro' | 'growth';
  features: string[];
};

function getUpgradeTarget(currentPlan: PlatformPlan): PlanCardInfo {
  if (currentPlan === 'STARTER' || currentPlan === 'PRO') {
    return {
      name: 'PRO',
      price: 'from ₦12,000 / 6 months',
      slug: 'pro',
      features: [
        `${formatProFeeLabel()} platform & service fees (vs 5% on Free)`,
        'Up to 3 portfolio categories',
        'Full bookings, shop, and creator tools',
        'Cancel anytime — benefits last until period end',
      ],
    };
  }

  return {
    name: 'GROWTH',
    price: 'from ₦35,000 / 6 months',
    slug: 'growth',
    features: [
      '3.5% platform & service fees',
      'Invite-only — request access via support',
      'Same tools as Pro at a lower fee',
    ],
  };
}

export function UpgradeModal({
  isOpen,
  onClose,
  limitType,
  currentPlan,
}: UpgradeModalProps) {
  const message = PLAN_LIMIT_MESSAGES[limitType];
  const targetPlan = getUpgradeTarget(currentPlan);
  const description =
    typeof message.description === 'function'
      ? message.description(currentPlan)
      : message.description;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl border-orange-200 bg-[#FFF8EE] p-0 shadow-2xl">
        <div className="p-6 sm:p-7">
          <DialogHeader className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <Lock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="space-y-2 text-center">
              <DialogTitle className="font-display text-2xl">{message.title}</DialogTitle>
              <DialogDescription className="font-body text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="font-body">
                You&apos;re on {currentPlan}
              </Badge>
            </div>
          </DialogHeader>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-4 opacity-80">
              <p className="font-display text-lg">{currentPlan}</p>
              <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                <X className="mt-0.5 h-4 w-4 text-red-500" />
                <span>Limit hit: {message.feature}</span>
              </div>
            </div>

            <div className="rounded-xl border-2 border-orange-300 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-lg">{targetPlan.name}</p>
                <p className="text-xs font-medium text-muted-foreground">{targetPlan.price}</p>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-green-600" />
                  <span>{message.feature}</span>
                </div>
                {targetPlan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-green-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Button asChild className="w-full bg-orange-600 text-white hover:bg-orange-700">
              <Link href={`/settings?tab=billing&upgrade=${targetPlan.slug}`}>
                View {targetPlan.name} plans
              </Link>
            </Button>
            <Button variant="ghost" className="w-full" onClick={onClose}>
              Maybe later
            </Button>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Cancel anytime. No hidden fees.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
