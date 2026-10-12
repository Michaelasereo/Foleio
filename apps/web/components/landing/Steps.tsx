'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Calendar, FileDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Italic, frame } from './ui';

const STEP_MS = 4200;

const BANNER =
  'https://fnqnrdmzxgovaydlqyvl.supabase.co/storage/v1/object/public/crealio/banners/9efc3ea2-0891-4e89-9e20-4b018bf525ad/1784747927517-38t763wryxb.webp';
const AVATAR =
  'https://fnqnrdmzxgovaydlqyvl.supabase.co/storage/v1/object/public/crealio/avatars/9efc3ea2-0891-4e89-9e20-4b018bf525ad/1784744437119-oxcceyvkp5o.webp';
const KAFTAN =
  'https://pub-0e820f06444a4679b7a9b03be8fa9435.r2.dev/products/images/11180bad-7995-4d89-b0c2-8ca3997667f7-1784746166564.jpg';

const STEPS = [
  {
    title: 'Share.',
    body: 'Put your Foleio link in your Instagram bio, your WhatsApp status, your TikTok. One link, everything you sell.',
  },
  {
    title: 'Sell.',
    body: 'Clients book a service, buy a digital download, or order a physical product, and pay online. No back-and-forth.',
  },
  {
    title: 'Get paid.',
    body: 'The money settles to your Nigerian bank account. No wallet to withdraw from.',
  },
] as const;

const slide = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function Steps() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % STEPS.length);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [reduced]);

  return (
    <div
      id="how"
      className={`${frame} flex flex-wrap items-center gap-x-[72px] gap-y-12 pt-[88px]`}
    >
      <div className="min-w-0 flex-[1_1_380px]">
        <h2 className="m-0 text-[clamp(32px,3.5vw,50px)] font-[450] leading-[1.08] tracking-[-0.035em] text-[#1c1b19]">
          From your bio to your bank <Italic>in three steps.</Italic>
        </h2>
        <div className="relative mt-10">
          <span className="absolute bottom-1 left-0 top-1 w-0.5 bg-[#e6e5df]" aria-hidden="true" />
          {STEPS.map((step, index) => {
            const selected = index === active;
            return (
              <button
                key={step.title}
                type="button"
                aria-pressed={selected}
                onClick={() => setActive(index)}
                className="relative block w-full border-0 bg-transparent py-1 pl-[26px] pr-0 text-left"
              >
                {selected ? (
                  <motion.span
                    layoutId="step-rail"
                    className="absolute bottom-1 left-0 top-1 w-0.5 bg-[#131210]"
                    transition={reduced ? { duration: 0 } : slide}
                  />
                ) : null}
                <div
                  className={`text-[22px] font-[450] tracking-[-0.025em] ${selected ? 'text-[#1c1b19]' : 'text-[#85847e]'}`}
                >
                  {step.title}
                </div>
                <p className="mt-1.5 max-w-[400px] pb-4 text-[#55544f]">{step.body}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="box-border flex min-h-[420px] min-w-0 flex-[1_1_460px] items-center overflow-hidden rounded-[28px] bg-[#f3f2ed] px-8 py-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            className="w-full"
            initial={reduced ? false : { x: 56, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 48, opacity: 0 }}
            transition={reduced ? { duration: 0 } : slide}
          >
            {active === 0 ? <ShareImage /> : null}
            {active === 1 ? <SellImage /> : null}
            {active === 2 ? <PaidImage /> : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ShareImage() {
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_24px_50px_-28px_rgba(19,18,16,0.35)]">
      <div className="relative h-[168px]">
        <img src={BANNER} alt="" className="h-full w-full object-cover" />
        <img
          src={AVATAR}
          alt=""
          className="absolute -bottom-7 left-6 h-14 w-14 rounded-full border-[3px] border-white object-cover"
        />
      </div>
      <div className="px-6 pb-6 pt-11">
        <div className="text-[18px] font-medium tracking-[-0.02em]">amatathelabel</div>
        <p className="mt-1 text-[13px] text-[#6b6a64]">One link for bookings and products</p>
        <div className="mt-4 flex min-h-[42px] items-center justify-between gap-3 rounded-full bg-[#f3f2ed] px-4 text-[14px]">
          <span className="truncate font-medium">foleio.com/creator/amatathelabel</span>
          <span className="shrink-0 text-[12px] text-[#6b6a64]">Instagram bio</span>
        </div>
      </div>
    </div>
  );
}

function SellImage() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-[18px] bg-white p-3 shadow-[0_16px_40px_-28px_rgba(19,18,16,0.45)]">
        <img src={KAFTAN} alt="" className="h-16 w-16 shrink-0 rounded-[12px] object-cover" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium tracking-[-0.02em]">Bloom Kaftan</div>
          <div className="mt-0.5 text-[13px] text-[#6b6a64]">Kemi ordered</div>
        </div>
        <div className="text-right">
          <div className="text-[14px] font-semibold">₦50,500</div>
          <div className="mt-0.5 text-[12px] text-[#6b6a64]">Physical</div>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-[18px] bg-white p-3 shadow-[0_16px_40px_-28px_rgba(19,18,16,0.45)]">
        <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-[12px] bg-[#e8efff] text-[#1e54e6]">
          <Calendar aria-hidden="true" size={22} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium tracking-[-0.02em]">Bridal makeup</div>
          <div className="mt-0.5 text-[13px] text-[#6b6a64]">Chiamaka booked · Sat 14 Nov</div>
        </div>
        <div className="text-right">
          <div className="text-[14px] font-semibold">₦40,000</div>
          <div className="mt-0.5 text-[12px] text-[#6b6a64]">Booking</div>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-[18px] bg-white p-3 shadow-[0_16px_40px_-28px_rgba(19,18,16,0.45)]">
        <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-[12px] bg-[#f3e8ff] text-[#7c3aed]">
          <FileDown aria-hidden="true" size={22} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium tracking-[-0.02em]">Lookbook PDF</div>
          <div className="mt-0.5 text-[13px] text-[#6b6a64]">Ada downloaded</div>
        </div>
        <div className="text-right">
          <div className="text-[14px] font-semibold">₦8,000</div>
          <div className="mt-0.5 text-[12px] text-[#6b6a64]">Digital</div>
        </div>
      </div>
    </div>
  );
}

function PaidImage() {
  return (
    <div className="rounded-[22px] bg-white px-6 py-7 shadow-[0_24px_50px_-28px_rgba(19,18,16,0.35)]">
      <div className="flex items-center gap-2 text-[13px] text-[#3b3a36]">
        <span className="h-[9px] w-[9px] rounded-full bg-[#0b8043]" />
        <span>Settled</span>
      </div>
      <div className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em]">₦38,500</div>
      <p className="mt-2 text-[15px] text-[#3b3a36]">to ACME Bank ••2207</p>
      <div className="mt-5 flex flex-col gap-2 border-t border-[#ebeae5] pt-4 text-[13px] text-[#6b6a64]">
        <div className="flex justify-between gap-3">
          <span>Bridal makeup deposit</span>
          <span>₦40,000</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Platform and service fee</span>
          <span>− ₦1,500</span>
        </div>
      </div>
      <div className="mt-4 flex justify-between border-t border-[#ebeae5] pt-[14px] text-[13px]">
        <span className="text-[#6b6a64]">Sat 14 Nov</span>
        <span className="font-medium">In your bank</span>
      </div>
    </div>
  );
}
