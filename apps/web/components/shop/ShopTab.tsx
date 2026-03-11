'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductModal } from '@/components/shop/ProductModal';
import { CheckoutForm } from '@/components/shop/CheckoutForm';

type ProductVariant = {
  id: string;
  name: string;
  options: string[];
};

type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: 'physical' | 'digital';
  imageUrl: string | null;
  variants: ProductVariant[];
};

type DeliveryTier = {
  id: string;
  name: string;
  description: string | null;
  flatRate: number;
  estimatedDays: string | null;
};

type CartItem = {
  product: ShopProduct;
  selectedVariants: Record<string, string>;
  quantity: number;
};

export function ShopTab({ username }: { username: string }) {
  const [creatorId, setCreatorId] = useState('');
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [deliveryTiers, setDeliveryTiers] = useState<DeliveryTier[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    async function fetchShop() {
      const response = await fetch(`/api/shop/${username}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) return;
      setCreatorId(data.creator?.id || '');
      setProducts(data.products || []);
      setDeliveryTiers(data.deliveryTiers || []);
    }
    void fetchShop();
  }, [username]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  function addToCart(payload: CartItem) {
    setCart((previous) => [...previous, payload]);
    setSelectedProduct(null);
  }

  return (
    <div className="space-y-4">
      {products.length === 0 ? (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          No products available yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
          ))}
        </div>
      )}

      {cart.length > 0 ? (
        <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border bg-card p-4 shadow-lg">
          <div>
            <p className="text-sm text-muted-foreground">{cart.length} item(s) in cart</p>
            <p className="font-semibold">₦{(subtotal / 100).toLocaleString('en-NG')}</p>
          </div>
          <Button onClick={() => setCheckoutOpen(true)}>Checkout</Button>
        </div>
      ) : null}

      {selectedProduct ? (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
        />
      ) : null}

      <CheckoutForm
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        deliveryTiers={deliveryTiers}
        creatorId={creatorId}
        onSuccess={() => {
          setCart([]);
          setCheckoutOpen(false);
        }}
      />
    </div>
  );
}
