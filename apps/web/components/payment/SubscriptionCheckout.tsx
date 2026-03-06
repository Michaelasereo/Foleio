'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNaira } from '@foleio/utils';
import { Check, Shield } from 'lucide-react';

interface SubscriptionCheckoutProps {
  creator: any;
  plans: any[];
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionCheckout({
  creator,
  plans,
  isOpen,
  onClose,
}: SubscriptionCheckoutProps) {
  const [selectedPlan, setSelectedPlan] = useState(plans[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Initialize payment
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '', // Will get from user session
          amount: selectedPlan.price / 100,
          creatorId: creator.id,
          planId: selectedPlan.id,
          type: 'subscription',
        }),
      });

      if (!response.ok) {
        throw new Error('Payment initialization failed');
      }

      const data = await response.json();
      // Redirect to Paystack
      window.location.href = data.authorization_url;
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subscribe to {creator.displayName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose a Plan</h3>
            <div className="grid gap-3">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    selectedPlan.id === plan.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : ''
                  }`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{plan.name}</span>
                      <span className="text-2xl font-bold">
                        {formatNaira(plan.price / 100)}
                        <span className="text-sm font-normal text-muted-foreground">
                          /month
                        </span>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <ul className="space-y-2">
                        {plan.features.map((feature: string, i: number) => (
                          <li key={i} className="flex items-center text-sm">
                            <Check className="mr-2 h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Security & Summary */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">
                Secure payment powered by Paystack
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">
                  {formatNaira(selectedPlan.price / 100)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </p>
              </div>
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Subscribe Now'}
              </Button>
            </div>
          </div>

          {/* Platform Fee Disclosure */}
          <p className="text-xs text-muted-foreground text-center">
            Foleio charges a 15% platform fee. {creator.displayName} receives 85%
            of your subscription.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

