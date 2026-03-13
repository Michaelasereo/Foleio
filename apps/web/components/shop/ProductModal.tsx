'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

export function ProductModal({
  product,
  onClose,
  onAddToCart,
}: {
  product: ShopProduct;
  onClose: () => void;
  onAddToCart: (payload: {
    product: ShopProduct;
    selectedVariants: Record<string, string>;
    quantity: number;
  }) => void;
}) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  const allVariantsSelected = useMemo(
    () => product.variants.every((variant) => selectedVariants[variant.name]),
    [product.variants, selectedVariants]
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-xl bg-muted">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={720}
                height={720}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : null}
          </div>
          <div>
            <p className="text-xl font-semibold">{product.name}</p>
            <p className="text-sm text-muted-foreground">{product.description}</p>
            <p className="mt-2 text-lg font-bold text-primary">
              ₦{(product.price / 100).toLocaleString('en-NG')}
            </p>
          </div>

          {product.variants.map((variant) => (
            <div key={variant.id}>
              <p className="mb-2 text-sm font-medium">{variant.name}</p>
              <div className="flex flex-wrap gap-2">
                {variant.options.map((option) => (
                  <button
                    key={option}
                    onClick={() =>
                      setSelectedVariants((previous) => ({
                        ...previous,
                        [variant.name]: option,
                      }))
                    }
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm',
                      selectedVariants[variant.name] === option
                        ? 'border-primary bg-primary/5 font-medium text-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-semibold">{quantity}</span>
            <button type="button" onClick={() => setQuantity(quantity + 1)}>
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button
            className="w-full"
            disabled={product.variants.length > 0 && !allVariantsSelected}
            onClick={() => onAddToCart({ product, selectedVariants, quantity })}
          >
            Add to Cart · ₦{((product.price * quantity) / 100).toLocaleString('en-NG')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
