import type { ReactNode } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Reveal } from '@/components/landing/Reveal';
import { Italic, LogoMark, Pill, frame } from '@/components/landing/ui';

export type ProductStep = { title: string; body: string };
export type ProductRow = { title: string; body: string; free: string; pro?: boolean };
export type ProductLink = { href: string; label: string };

function PlanMark({ included, label }: { included: boolean; label: string }) {
  return (
    <span className="flex h-6 items-center justify-center" role="img" aria-label={included ? `${label} included` : `${label} not included`}>
      {included ? (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1c1b19] text-white">
          <Check aria-hidden="true" size={12} strokeWidth={2.75} />
        </span>
      ) : (
        <span className="inline-flex h-5 w-5 items-center justify-center text-[16px] leading-none text-[#c8c5be]" aria-hidden>
          —
        </span>
      )}
    </span>
  );
}

const heading = 'text-[clamp(36px,4.4vw,56px)] font-[450] leading-[1.02] tracking-[-0.045em] text-[#1c1b19]';

export function ProductStory({
  eyebrow,
  title,
  lede,
  stepsTitle,
  steps,
  compareTitle,
  compareLede,
  rows,
  barLabel,
  barLinks,
  closeTitle,
  closeLede,
  preview,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: string;
  stepsTitle: ReactNode;
  steps: ProductStep[];
  compareTitle: ReactNode;
  compareLede: string;
  rows: ProductRow[];
  barLabel?: string;
  barLinks?: ProductLink[];
  closeTitle: ReactNode;
  closeLede: string;
  preview: ReactNode;
}) {
  return (
    <main>
      <section className={`${frame} grid items-center gap-12 pb-6 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:pt-14`}>
        <Reveal>
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#8a877f]">{eyebrow}</p>
          <h1 className={`mt-4 max-w-[560px] ${heading}`}>{title}</h1>
          <p className="mt-5 max-w-[460px] text-[17px] leading-[1.55] text-[#55544f]">{lede}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Pill href="/signup" className="min-h-[46px] px-[22px] text-[16px]">
              Start for free
            </Pill>
            <Link href="/pricing" className="inline-flex min-h-[44px] items-center text-[16px] text-[#3b3a36]">
              See pricing →
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-[#8a877f]">
            Free plan. ₦0 a month. Paid to your bank the next business day.
          </p>
        </Reveal>
        <Reveal delay={80}>{preview}</Reveal>
      </section>

      <Reveal>
        <section className={`${frame} py-16 sm:py-20`}>
          <h2 className={`max-w-[640px] ${heading}`}>{stepsTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-[22px] bg-[#f3f1ec] px-5 py-6">
                <p className="text-[12px] font-medium tracking-[0.08em] text-[#8a877f]">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-8 text-[18px] font-semibold tracking-[-0.02em]">{step.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.5] text-[#6b6a64]">{step.body}</p>
              </article>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className={`${frame} grid gap-10 pb-8 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)] lg:gap-16`}>
          <div>
            <h2 className={heading}>{compareTitle}</h2>
            <p className="mt-4 max-w-[280px] text-[15px] leading-[1.55] text-[#6b6a64]">{compareLede}</p>
            <Link href="/pricing" className="mt-5 inline-flex text-[15px] text-[#1c1b19]">
              Compare the plans →
            </Link>
          </div>
          <div>
            <div className="grid grid-cols-[minmax(0,1fr)_56px_56px] items-center border-b border-[#e6e3dc] pb-3 text-[13px] font-semibold">
              <span />
              <span className="text-center">Free</span>
              <span className="text-center">Pro</span>
            </div>
            {rows.map((row) => (
              <div key={row.title} className="grid grid-cols-[minmax(0,1fr)_56px_56px] items-start border-b border-[#e6e3dc] py-4">
                <div className="pr-4">
                  <h3 className="text-[16px] font-semibold tracking-[-0.02em]">{row.title}</h3>
                  <p className="mt-1 text-[14px] leading-[1.45] text-[#6b6a64]">{row.body}</p>
                </div>
                <PlanMark included={!row.pro} label={`Free, ${row.title}`} />
                <PlanMark included label={`Pro, ${row.title}`} />
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {barLabel && barLinks ? (
        <Reveal>
          <div className={`${frame} py-8`}>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-full bg-[#131210] px-5 py-3.5 text-white sm:px-6">
              <p className="text-[16px] font-medium tracking-[-0.02em]">{barLabel}</p>
              <div className="flex flex-wrap gap-2">
                {barLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] text-white"
                  >
                    {link.label} →
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      ) : null}

      <Reveal>
        <section className={`${frame} px-6 pb-20 pt-16 text-center`}>
          <LogoMark className="mx-auto h-14 w-14" />
          <h2 className={`mx-auto mt-6 max-w-[640px] ${heading}`}>{closeTitle}</h2>
          <p className="mx-auto mt-4 max-w-[420px] text-[16px] leading-[1.5] text-[#6b6a64]">{closeLede}</p>
          <div className="mt-7">
            <Pill href="/signup" className="min-h-[46px] px-[22px] text-[16px]">
              Start for free
            </Pill>
          </div>
          <p className="mt-4 text-[13px] text-[#8a877f]">
            Free plan. ₦0 a month. Upgrade only when it saves you money.
          </p>
          <p className="mt-10 text-[20px] text-[#1c1b19]">
            <Italic>Your work. Your world. Your Foleio.</Italic>
          </p>
        </section>
      </Reveal>
    </main>
  );
}
