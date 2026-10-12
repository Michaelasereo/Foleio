import {
  Calendar,
  Clock,
  FileText,
  Gift,
  Landmark,
  Link2,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { frame } from './ui';

const TONES = [
  'bg-[#fff1e6] text-[#ea580c]',
  'bg-[#e8efff] text-[#1e54e6]',
  'bg-[#e8f8ef] text-[#059669]',
  'bg-[#fde8ea] text-[#e11d48]',
  'bg-[#f3e8ff] text-[#7c3aed]',
] as const;

const FEATURES: {
  title: string;
  body: string;
  icon: LucideIcon;
  tone: (typeof TONES)[number];
  pro?: boolean;
}[] = [
  {
    title: 'Public page',
    body: 'A branded link for your profile, services, shop, and portfolio. Share it anywhere you already have an audience.',
    icon: Link2,
    tone: TONES[0],
  },
  {
    title: 'Bookings',
    body: 'Clients pick a free slot and pay a deposit or the full amount. Foleio emails a reminder before the balance is due.',
    icon: Calendar,
    tone: TONES[1],
  },
  {
    title: 'Shop',
    body: 'Physical products with stock, delivery options, and preorders.',
    icon: ShoppingBag,
    tone: TONES[2],
  },
  {
    title: 'Custom quotes',
    body: 'Send a quote link for work that is not on your price list. Your client pays straight from it.',
    icon: FileText,
    tone: TONES[3],
  },
  {
    title: 'Payouts',
    body: 'Your share settles to your Nigerian bank account. No wallet to withdraw from.',
    icon: Landmark,
    tone: TONES[4],
  },
  {
    title: 'Reviews',
    body: 'Up to 3 customer reviews on your page, or 10 on Pro.',
    icon: Star,
    tone: TONES[0],
  },
  {
    title: 'Digital and gifting',
    body: 'PDF downloads, gift cards, and coupon codes.',
    icon: Gift,
    tone: TONES[1],
    pro: true,
  },
  {
    title: 'Top Creators',
    body: 'Get listed on the Foleio marketplace and in Google search.',
    icon: Sparkles,
    tone: TONES[2],
    pro: true,
  },
  {
    title: 'Availability',
    body: 'Set the days and hours clients can book. Closed days stay off your link.',
    icon: Clock,
    tone: TONES[3],
  },
];

export function FeatureList() {
  return (
    <div id="features" className={`${frame} pt-12`}>
      <div className="overflow-hidden rounded-[22px] bg-[#e7e5e0] p-px">
        <div className="grid grid-cols-1 gap-px min-[761px]:grid-cols-2 min-[1024px]:grid-cols-3">
          {FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-white px-7 py-7">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${item.tone}`}
                >
                  <Icon aria-hidden="true" size={15} strokeWidth={1.75} />
                </span>
                <div className="mt-4 flex items-center gap-2">
                  <h3 className="m-0 text-[16px] font-medium tracking-[-0.02em] text-[#1c1b19]">
                    {item.title}
                  </h3>
                  {item.pro ? (
                    <span className="text-[10px] font-semibold tracking-[0.08em] text-[#0b8043]">
                      PRO
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[14px] leading-[1.55] text-[#71717a]">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
