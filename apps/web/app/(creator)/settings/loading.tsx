import { Skeleton } from '@/components/skeletons';

export default function SettingsLoading() {
  return (
    <div className="animate-in space-y-6 fade-in duration-300">
      <Skeleton className="h-8 w-24" />

      <div className="flex gap-6 border-b border-stone-100 pb-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-none" />
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 flex-shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>

      <div className="max-w-lg space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="mt-4 h-10 w-28 rounded-full" />
      </div>
    </div>
  );
}
