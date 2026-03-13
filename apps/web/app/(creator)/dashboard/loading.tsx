import { Skeleton, SkeletonContentRow, SkeletonStatCards } from '@/components/skeletons';

export default function DashboardLoading() {
  return (
    <div className="animate-in space-y-8 fade-in duration-300">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <SkeletonStatCards />

      <div className="space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonContentRow key={i} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-6">
        <Skeleton className="mb-6 h-5 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}
