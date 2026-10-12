import { frame } from './ui';

export function AudienceLine() {
  return (
    <div className={`${frame} pt-16 text-center`}>
      <p className="mx-auto max-w-[900px] text-[clamp(22px,2.3vw,31px)] leading-[1.36] tracking-[-0.02em] text-[#85847e]">
        Built for creators turning a following on Instagram, WhatsApp, and TikTok into{' '}
        <span className="text-[#1c1b19]">bookings</span>,{' '}
        <span className="text-[#1c1b19]">digital downloads</span>, and{' '}
        <span className="text-[#1c1b19]">physical sales</span>.
      </p>
    </div>
  );
}
