import { Lock } from 'lucide-react';
import Link from 'next/link';
import { Italic, frame } from './ui';

const card =
  'box-border flex h-[450px] min-w-0 flex-col overflow-hidden rounded-[28px] bg-[#f3f2ed] px-9 pb-0 pt-9';
const title = 'text-[22px] font-[450] tracking-[-0.03em]';
const body = 'mt-1.5 text-[15px] text-[#6b6a64]';
const explore =
  'mt-2.5 inline-flex min-h-[44px] items-center text-[14px] font-medium text-[#1c1b19]';
const sheet =
  'mt-[14px] min-h-0 flex-[1_1_auto] overflow-hidden rounded-t-[18px] bg-[#fdfdfb] px-6 pt-[22px] text-[14px] shadow-[0_0_0_1px_rgba(19,18,16,0.05)]';
const row = 'flex items-center justify-between gap-3 border-b border-[#efeee9] py-[11px]';

export function ProductGrid() {
  return (
    <div id="product" className={`${frame} pt-[88px]`}>
      <h2 className="m-0 text-[clamp(32px,3.5vw,50px)] font-[450] leading-[1.08] tracking-[-0.035em] text-[#1c1b19]">
        Two ways to earn. <Italic>One link.</Italic>
      </h2>

      <div className="mt-9 flex flex-wrap gap-4">
        <div className={`${card} flex-[1.55_1_480px]`}>
          <div className={title}>One link for everything you sell.</div>
          <p className={`${body} max-w-[430px]`}>
            Your profile, services, shop, and portfolio on one page. Share it anywhere you already
            have an audience.
          </p>
          <Link href="/product/link" className={explore}>
            Explore Link →
          </Link>
          <div className={sheet}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#131210] text-[14px] font-semibold text-[#f2f1ec]">
                  AO
                </span>
                <div>
                  <div className="text-[16px] font-semibold tracking-[-0.02em]">Adaeze Okoro</div>
                  <div className="text-[13px] text-[#6b6a64]">
                    Bridal makeup artist · Lekki, Lagos
                  </div>
                </div>
              </div>
              <span className="text-[13px] text-[#3b3a36]">foleio.com/creator/adaeze</span>
            </div>
            <div className="mt-4 inline-flex rounded-full bg-[#f0efea] p-1 text-[13px]">
              <span className="rounded-full bg-white px-3.5 py-1.5 font-medium shadow-[0_1px_2px_rgba(19,18,16,0.12)]">
                Book
              </span>
              <span className="px-3.5 py-1.5 text-[#6b6a64]">Shop</span>
              <span className="px-3.5 py-1.5 text-[#6b6a64]">Portfolio</span>
            </div>
            <div className="mt-3">
              <div className={row}>
                <span>Bridal makeup</span>
                <span className="font-medium">₦80,000</span>
              </div>
              <div className={row}>
                <span>Bridal trial</span>
                <span className="font-medium">₦25,000</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-[11px]">
                <span>Soft glam</span>
                <span className="font-medium">₦30,000</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`${card} flex-[1_1_340px]`}>
          <div className={title}>Bookings that confirm themselves.</div>
          <p className={body}>
            Clients pick a free slot and pay a deposit or the full amount. Foleio emails a reminder
            before the balance is due.
          </p>
          <Link href="/product/bookings" className={explore}>
            Explore Bookings →
          </Link>
          <div className={`${sheet} px-5 pt-[18px] text-[13px]`}>
            <div className="text-[12px] text-[#6b6a64]">Upcoming</div>
            <div className="border-b border-[#efeee9] py-[11px]">
              <div className="flex justify-between gap-2">
                <span className="font-medium">Bridal makeup · Chiamaka E.</span>
                <span className="whitespace-nowrap text-[#6b6a64]">Sat 14 Nov</span>
              </div>
              <div className="mt-0.5 text-[#6b6a64]">Deposit paid ₦40,000 · balance due 7 Nov</div>
            </div>
            <div className="border-b border-[#efeee9] py-[11px]">
              <div className="flex justify-between gap-2">
                <span className="font-medium">Soft glam · Tolu A.</span>
                <span className="whitespace-nowrap text-[#6b6a64]">Sun 15 Nov</span>
              </div>
              <div className="mt-0.5 text-[#6b6a64]">Paid in full ₦30,000</div>
            </div>
            <div className="py-[11px]">
              <div className="flex justify-between gap-2">
                <span className="font-medium">Bridal trial · Halima B.</span>
                <span className="whitespace-nowrap text-[#6b6a64]">Wed 18 Nov</span>
              </div>
              <div className="mt-0.5 text-[#6b6a64]">Paid in full ₦25,000</div>
            </div>
          </div>
        </div>

        <div className={`${card} flex-[1_1_300px]`}>
          <div className={title}>A shop on the same link as your services.</div>
          <p className={body}>
            Physical products with stock, delivery, and preorders. Pro adds PDF downloads, gift
            cards, and coupon codes.
          </p>
          <Link href="/product/shop" className={explore}>
            Explore Shop →
          </Link>
          <div className={`${sheet} flex flex-col gap-[7px] px-5 pt-[18px] text-[13px]`}>
            <div className="flex justify-between">
              <span>
                Lash kit <span className="text-[#6b6a64]">(preorder)</span>
              </span>
              <span>₦18,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#55544f]">Quantity</span>
              <span>1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#55544f]">Delivery · Lagos</span>
              <span>₦3,000</span>
            </div>
            <div className="flex justify-between border-t border-[#efeee9] pt-[9px] font-semibold">
              <span>Total</span>
              <span>₦21,000</span>
            </div>
            <div className="mt-1.5 flex h-10 items-center justify-center rounded-full bg-[#131210] font-medium text-white">
              Pay ₦21,000
            </div>
            <div className="flex items-center justify-center gap-1 text-[11px] text-[#6b6a64]">
              <Lock aria-hidden="true" size={12} strokeWidth={1.75} />
              Secured
            </div>
          </div>
        </div>

        <div className={`${card} flex-[1_1_300px]`}>
          <div className={title}>Paid to your bank. Not to a wallet.</div>
          <p className={body}>Your share settles straight to your Nigerian bank account.</p>
          <a href="#pricing" className={explore}>
            See pricing →
          </a>
          <div className={`${sheet} px-6 pt-5 text-[13px]`}>
            <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-0.5">
              <span className="text-[12px] text-[#6b6a64]">November</span>
              <span className="text-[12px] text-[#6b6a64]">ACME Bank ••2207</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-[22px] gap-y-2">
              <div>
                <div className="text-[#6b6a64]">Settled</div>
                <div className="text-[21px] font-semibold tracking-[-0.03em]">₦412,300</div>
              </div>
              <div>
                <div className="text-[#6b6a64]">On its way</div>
                <div className="text-[21px] font-semibold tracking-[-0.03em]">₦38,500</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between border-t border-[#efeee9] py-[9px]">
                <span>Bridal makeup deposit</span>
                <span className="font-medium">₦38,500</span>
              </div>
              <div className="flex justify-between border-t border-[#efeee9] py-[9px]">
                <span>Lash kit order</span>
                <span className="font-medium">₦20,165</span>
              </div>
              <div className="flex justify-between border-t border-[#efeee9] py-[9px]">
                <span>Soft glam</span>
                <span className="font-medium">₦28,850</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
