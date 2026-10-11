import { publicLinkPreview } from '@/lib/landing/amata-preview';
import { HeroProductFrame } from './HeroProductFrame';
import { Italic, Pill, frame } from './ui';

export function Hero() {
  return (
    <div className={`${frame} pt-14 text-center`}>
      <h1 className="mx-auto max-w-[980px] text-[clamp(38px,5vw,66px)] font-[450] leading-[1.04] tracking-[-0.04em] text-[#1c1b19]">
        Get paid for your craft. <Italic block>Bookings, Digital & Physical Products.</Italic>
      </h1>
      <p className="mx-auto mt-6 max-w-[660px] text-[19px] leading-[1.55] text-[#55544f]">
        Creators get one link to take bookings, sell products while collecting international payments
        from across the globe.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-[26px] gap-y-3">
        <Pill href="/signup" className="min-h-[46px] px-[22px] text-[16px] tracking-[-0.01em]">
          Request invite
        </Pill>
        <a href="#how" className="inline-flex min-h-[44px] items-center text-[16px] text-[#3b3a36]">
          See how it works →
        </a>
      </div>
      <p className="mt-[18px] text-[14px] text-[#6b6a64]">
        Free plan. ₦0 a month.
      </p>
      <HeroProductFrame publicLink={publicLinkPreview} />
    </div>
  );
}
