import { Skeleton, SkeletonStatCards, SkeletonTable } from '@/components/skeletons';

export default function EarningsLoading() {
  return (
    <div className="animate-in space-y-8 fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      <SkeletonStatCards />
      <SkeletonTable rows={6} />
    </div>
  );
}
