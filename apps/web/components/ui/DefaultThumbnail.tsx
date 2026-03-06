'use client';

interface DefaultThumbnailProps {
  title: string;
  aspectRatio?: '16/9' | '4/3' | '1/1';
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<DefaultThumbnailProps['size']>, string> = {
  sm: 'text-xs',
  md: 'text-sm md:text-base',
  lg: 'text-base md:text-lg',
};

export function DefaultThumbnail({
  title,
  aspectRatio = '16/9',
  size = 'md',
}: DefaultThumbnailProps) {
  const safeTitle = title?.trim() || 'Untitled Video';
  const displayTitle = safeTitle.length > 40 ? `${safeTitle.slice(0, 37)}...` : safeTitle;

  return (
    <div
      style={{ aspectRatio }}
      className="relative flex w-full select-none flex-col items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#F97316] via-[#F97316] to-[#C2500A] p-4"
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/8" />
      <div className="absolute left-3 top-3 h-12 w-12 rounded-full bg-white/6" />

      <div className="relative z-10 mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20">
        <div className="ml-1 h-0 w-0 border-b-[6px] border-l-[10px] border-t-[6px] border-b-transparent border-l-white border-t-transparent" />
      </div>

      <p
        className={`relative z-10 px-2 text-center font-semibold leading-tight text-white drop-shadow-sm ${sizeClasses[size]}`}
      >
        {displayTitle}
      </p>

      <p className="absolute bottom-2 right-3 z-10 text-[10px] font-medium tracking-wide text-white/50">
        Foleio
      </p>
    </div>
  );
}
