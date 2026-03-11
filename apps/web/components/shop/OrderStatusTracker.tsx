'use client';

import { cn } from '@/lib/utils';

export function OrderStatusTracker({ status }: { status: string }) {
  const steps = [
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'in_progress', label: 'Processing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
  ];

  const currentIndex = steps.findIndex((step) => step.key === status);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              index <= currentIndex ? 'bg-primary' : 'bg-muted'
            )}
          />
          <span
            className={cn(
              'mx-1 text-xs',
              index <= currentIndex ? 'font-medium text-primary' : 'text-muted-foreground'
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 ? (
            <div
              className={cn('h-px w-4', index < currentIndex ? 'bg-primary' : 'bg-muted')}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
