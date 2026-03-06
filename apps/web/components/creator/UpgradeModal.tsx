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
  type PlanLimitType,
} from '@/lib/utils/plan-limits';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: PlanLimitType;
  currentPlan: PlatformPlan;
}

type PlanCardInfo = {
  name: PlatformPlan;
  price: string;
  trial: boolean;
  slug: 'pro' | 'premium';
  features: string[];
};

function getUpgradeTarget(currentPlan: PlatformPlan): PlanCardInfo {
  if (currentPlan === 'STARTER') {
    return {
      name: 'PRO',
      price: 'NGN 8,000/month',
      trial: true,
      slug: 'pro',
      features: [
        'Unlimited content uploads',
        'Up to 3 subscription plans',
        'Collections and analytics',
      ],
    };
  }

  return {
    name: 'PREMIUM',
    price: 'NGN 15,000/month',
    trial: false,
    slug: 'premium',
    features: [
      'Unlimited subscription plans',
      'Advanced analytics',
      'Priority growth support',
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
              {targetPlan.trial ? (
                <Badge className="mt-2 bg-orange-600 text-white">3-day free trial</Badge>
              ) : null}
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
              <Link href={`/billing?upgrade=${targetPlan.slug}`}>Upgrade to {targetPlan.name}</Link>
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
