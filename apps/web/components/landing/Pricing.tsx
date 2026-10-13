import { Italic, Pill, frame } from './ui';

export function Pricing() {
  return (
    <div id="pricing" className={`${frame} pt-14 min-[761px]:pt-[88px]`}>
      <h2 className="m-0 text-[clamp(32px,3.5vw,50px)] font-[450] leading-[1.08] tracking-[-0.035em] text-[#1c1b19]">
        Free to start. <Italic>One fee, nothing hidden.</Italic>
      </h2>
      <p className="mt-4 max-w-[560px] text-[18px] text-[#55544f]">
        Foleio takes one platform and service fee per payment. There is no separate processing fee
        on top.
      </p>

      <div className="mt-9 flex flex-wrap gap-4">
        <div className="box-border min-w-0 flex-[1_1_340px] rounded-[28px] bg-[#f3f2ed] p-6 min-[761px]:p-9">
          <div className="text-[22px] font-[450] tracking-[-0.03em]">Free</div>
          <div className="text-[15px] text-[#6b6a64]">Everything you need to get booked.</div>
          <div className="mt-[22px] flex items-baseline gap-2">
            <span className="text-[48px] font-[450] leading-none tracking-[-0.04em]">₦0</span>
            <span className="text-[#6b6a64]">a month</span>
          </div>
          <div className="mt-2.5 font-medium">3.5% + ₦100 per transaction</div>
          <Pill href="/signup" className="mt-6 flex min-h-[46px] w-full">
            Request invite
          </Pill>
          <div className="mt-[26px] flex flex-col gap-2.5 border-t border-[#dcdbd5] pt-[22px] text-[15px] text-[#3b3a36]">
            <div>Public page, bookings, and shop</div>
            <div>Up to 10 services and 10 products (5 preorders)</div>
            <div>Up to 3 photos per product</div>
            <div>One portfolio gallery</div>
            <div>Custom quotes and up to 3 reviews</div>
            <div>Payouts to your bank</div>
          </div>
        </div>

        <div className="box-border min-w-0 flex-[1_1_340px] rounded-[28px] bg-[#131210] p-6 text-white min-[761px]:p-9">
          <div className="text-[22px] font-[450] tracking-[-0.03em]">Pro</div>
          <div className="text-[15px] text-[#a9a7a0]">A lower fee and more ways to sell.</div>
          <div className="mt-[22px] flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[48px] font-[450] leading-none tracking-[-0.04em]">₦3,000</span>
            <span className="text-[#a9a7a0]">a month, or ₦7,500 a quarter</span>
          </div>
          <div className="mt-2.5 font-medium">1.8% + ₦100 per transaction</div>
          <Pill href="/signup" tone="light" className="mt-6 flex min-h-[46px] w-full">
            Request invite, upgrade any time
          </Pill>
          <div className="mt-[26px] flex flex-wrap gap-x-8 gap-y-2.5 border-t border-[#34332e] pt-[22px] text-[15px] text-[#d6d4cd]">
            <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2.5">
              <div>Everything on Free</div>
              <div>Unlimited services and products</div>
              <div>Digital PDF downloads</div>
              <div>Gift cards and coupon codes</div>
              <div>Conditional free delivery</div>
            </div>
            <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2.5">
              <div>Up to 5 photos per product</div>
              <div>Up to 3 portfolio categories</div>
              <div>Up to 10 customer reviews</div>
              <div>Schedule templates</div>
              <div>Top Creators and Google listing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
