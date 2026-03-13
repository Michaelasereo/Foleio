import { Skeleton, SkeletonContentRow } from '@/components/skeletons';

export default function ContentLoading() {
  return (
    <div className="animate-in space-y-6 fade-in duration-300">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      <Skeleton className="h-10 w-48 rounded-xl" />

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonContentRow key={i} />
        ))}
      </div>
    </div>
  );
}
