'use client';

import { ShoppingBag } from 'lucide-react';

type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: 'physical' | 'digital';
  imageUrl: string | null;
};

export function ProductCard({
  product,
  onClick,
}: {
  product: ShopProduct;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-md"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground opacity-30" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="truncate font-semibold text-foreground">{product.name}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <p className="mt-2 font-bold text-primary">₦{(product.price / 100).toLocaleString('en-NG')}</p>
        {product.type === 'digital' ? (
          <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
            Digital
          </span>
        ) : null}
      </div>
    </div>
  );
}
