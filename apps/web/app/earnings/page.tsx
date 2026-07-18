import { Suspense } from 'react';
import { EarningsHub } from '@/components/creator/EarningsHub';
import { EarningsLoadingSkeleton } from '@/components/creator/EarningsLoadingSkeleton';

export const dynamic = 'force-dynamic';

export default function EarningsPage() {
  return (
    <Suspense fallback={<EarningsLoadingSkeleton />}>
      <EarningsHub />
    </Suspense>
  );
}
