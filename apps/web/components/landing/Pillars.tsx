import { Banknote, CreditCard, Link2, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Italic, frame } from './ui';

const PILLARS: {
  title: string;
  body: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  {
    title: 'Upfront',
    body: 'Take a deposit or full payment before the slot is held. A client who has paid shows up.',
    icon: Banknote,
    tone: 'bg-[#fff1e6] text-[#ea580c]',
  },
  {
    title: 'One link',
    body: 'Your profile, services, shop, and portfolio on a single page you control.',
    icon: Link2,
    tone: 'bg-[#e8efff] text-[#1e54e6]',
  },
  {
    title: 'Payments',
    body: 'Naira / USD prices, get paid anywhere to your Nigerian banks, payments secured on checkout. Built for how business is done here.',
    icon: CreditCard,
    tone: 'bg-[#e8f8ef] text-[#059669]',
  },
  {
    title: 'Yours',
    body: 'You set the prices, the availability, and the cancellation policy. Clients see it before they pay.',
    icon: SlidersHorizontal,
    tone: 'bg-[#fde8ea] text-[#e11d48]',
  },
];

export function Pillars() {
  return (
    <div className={`${frame} pt-14 min-[761px]:pt-[88px]`}>
      <div className="text-[15px] text-[#6b6a64]">Why Foleio works</div>
      <h2 className="m-0 mt-[14px] max-w-[760px] text-[clamp(32px,3.5vw,50px)] font-[450] leading-[1.08] tracking-[-0.035em] text-[#1c1b19]">
        Built for creators who are <Italic>done chasing payments.</Italic>
      </h2>
      <div className="mt-10 flex flex-wrap gap-x-7 gap-y-8">
        {PILLARS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="min-w-0 flex-[1_1_220px] border-t border-[#e6e5df] pt-[18px]"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.tone}`}
                >
                  <Icon aria-hidden="true" size={15} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <div className="font-medium leading-8">{item.title}</div>
                  <p className="mt-1 text-[15px] text-[#6b6a64]">{item.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
