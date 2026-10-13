'use client';

import type { PublicLinkPreview } from '@/lib/landing/amata-preview';
import { useState } from 'react';
import { DemoShot } from './DemoShot';
import { PublicLinkShot } from './PublicLinkShot';

const TABS = [
  { id: 'link', label: 'Link', section: 'overview' },
  { id: 'bookings', label: 'Bookings', section: 'bookings' },
  { id: 'shop', label: 'Shop', section: 'shop' },
  { id: 'earnings', label: 'Earnings', section: 'earnings' },
] as const;

export function HeroProductFrame({ publicLink }: { publicLink: PublicLinkPreview }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('link');
  const current = TABS.find((item) => item.id === tab) ?? TABS[0];
  const showLink = current.id === 'link';

  return (
    <div className="mt-11">
      <div className="mb-4 flex justify-center">
        <div
          role="tablist"
          aria-label="Product"
          className="inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full bg-[#e6e4de] p-1"
        >
          {TABS.map((item) => {
            const selected = item.id === current.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(item.id)}
                className={`min-h-[40px] rounded-full px-4 text-[14px] ${
                  selected
                    ? 'bg-white font-medium text-[#1c1b19] shadow-[0_1px_2px_rgba(19,18,16,0.12)]'
                    : 'text-[#6b6a64]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="overflow-hidden rounded-[20px] bg-white text-left shadow-[0_0_0_1px_rgba(19,18,16,0.06),0_40px_90px_-40px_rgba(19,18,16,0.28)]">
        <div className="flex h-[52px] items-center gap-4 border-b border-[#efeee9] px-[18px]">
          <div className="flex shrink-0 gap-[7px]">
            <span className="h-[11px] w-[11px] rounded-full bg-[#f25f57]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#f8bd2e]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#2bc840]" />
          </div>
          <div className="flex min-w-0 flex-1 justify-center">
            <div className="flex h-[30px] w-[400px] max-w-full items-center justify-center rounded-full border border-[#ebeae5] text-[13px] text-[#55544f]">
              {showLink ? 'foleio.com/creator/amatathelabel' : 'app.foleio.com'}
            </div>
          </div>
          <div className="w-[47px] shrink-0 max-[760px]:hidden" />
        </div>
        {showLink ? (
          <PublicLinkShot preview={publicLink} />
        ) : (
          <DemoShot
            key={current.section}
            section={current.section}
            embed="full"
            label={`${current.label} demo`}
            className="relative bg-[#fcfcfb]"
          />
        )}
      </div>
    </div>
  );
}
