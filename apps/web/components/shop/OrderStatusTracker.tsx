'use client';

import { cn } from '@/lib/utils';

function normalizeOrderStatus(status: string) {
  if (status === 'in_progress' || status === 'shipped') return 'processing';
  return status;
}

export function OrderStatusTracker({ status }: { status: string }) {
  const steps = [
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'processing', label: 'Processing' },
    { key: 'delivered', label: 'Delivered' },
  ];

  const normalized = normalizeOrderStatus(status);
  const currentIndex = steps.findIndex((step) => step.key === normalized);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              currentIndex >= 0 && index <= currentIndex ? 'bg-primary' : 'bg-muted'
            )}
          />
          <span
            className={cn(
              'mx-1 text-xs',
              currentIndex >= 0 && index <= currentIndex
                ? 'font-medium text-primary'
                : 'text-muted-foreground'
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 ? (
            <div
              className={cn(
                'h-px w-4',
                currentIndex >= 0 && index < currentIndex ? 'bg-primary' : 'bg-muted'
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
