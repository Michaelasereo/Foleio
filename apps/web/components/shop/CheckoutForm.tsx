'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type CartItem = {
  product: {
    id: string;
    name: string;
    price: number;
    type: 'physical' | 'digital';
  };
  selectedVariants: Record<string, string>;
  quantity: number;
};

type DeliveryTier = {
  id: string;
  name: string;
  flatRate: number;
  estimatedDays: string | null;
};

export function CheckoutForm({
  open,
  onClose,
  cart,
  deliveryTiers,
  creatorId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  deliveryTiers: DeliveryTier[];
  creatorId: string;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'address' | 'delivery' | 'summary'>('address');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [address, setAddress] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
  });
  const [deliveryTierId, setDeliveryTierId] = useState('');

  const hasPhysicalProduct = useMemo(
    () => cart.some((item) => item.product.type === 'physical'),
    [cart]
  );

  const selectedTier = useMemo(
    () => deliveryTiers.find((tier) => tier.id === deliveryTierId),
    [deliveryTierId, deliveryTiers]
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );
  const deliveryFee = hasPhysicalProduct ? selectedTier?.flatRate || 0 : 0;
  const total = subtotal + deliveryFee;

  async function pay() {
    setIsSubmitting(true);
    const response = await fetch('/api/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorId,
        items: cart.map((item) => ({
          productId: item.product.id,
          variantSelected: item.selectedVariants,
          quantity: item.quantity,
        })),
        deliveryTierId: hasPhysicalProduct ? deliveryTierId : null,
        deliveryAddress: address,
      }),
    });
    const data = await response.json();
    setIsSubmitting(false);
    if (!response.ok || !data?.paystackUrl) return;
    onSuccess();
    window.location.href = data.paystackUrl;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        {step === 'address' ? (
          <div className="space-y-3">
            <Input
              placeholder="Full name"
              value={address.name}
              onChange={(event) => setAddress((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              type="email"
              placeholder="Email"
              value={address.email}
              onChange={(event) => setAddress((prev) => ({ ...prev, email: event.target.value }))}
            />
            <Input
              placeholder="Phone"
              value={address.phone}
              onChange={(event) => setAddress((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <Input
              placeholder="Address"
              value={address.address}
              onChange={(event) => setAddress((prev) => ({ ...prev, address: event.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="City"
                value={address.city}
                onChange={(event) => setAddress((prev) => ({ ...prev, city: event.target.value }))}
              />
              <Input
                placeholder="State"
                value={address.state}
                onChange={(event) => setAddress((prev) => ({ ...prev, state: event.target.value }))}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => setStep(hasPhysicalProduct ? 'delivery' : 'summary')}
              disabled={!address.name || !address.email || !address.phone || !address.address || !address.city || !address.state}
            >
              Continue
            </Button>
          </div>
        ) : null}

        {step === 'delivery' ? (
          <div className="space-y-3">
            {deliveryTiers.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setDeliveryTierId(tier.id)}
                className={`w-full rounded-xl border p-3 text-left ${deliveryTierId === tier.id ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <p className="font-medium">{tier.name}</p>
                <p className="text-sm text-muted-foreground">
                  ₦{(tier.flatRate / 100).toLocaleString('en-NG')} · {tier.estimatedDays || 'No ETA'}
                </p>
              </button>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('address')}>
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep('summary')} disabled={!deliveryTierId}>
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'summary' ? (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={`${item.product.id}-${JSON.stringify(item.selectedVariants)}`} className="text-sm">
                {item.quantity}x {item.product.name}
              </div>
            ))}
            <div className="space-y-1 rounded-xl border p-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₦{(subtotal / 100).toLocaleString('en-NG')}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>₦{(deliveryFee / 100).toLocaleString('en-NG')}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>₦{(total / 100).toLocaleString('en-NG')}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(hasPhysicalProduct ? 'delivery' : 'address')}
              >
                Back
              </Button>
              <Button className="flex-1" onClick={pay} disabled={isSubmitting}>
                {isSubmitting ? 'Initializing...' : 'Pay via Paystack'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
