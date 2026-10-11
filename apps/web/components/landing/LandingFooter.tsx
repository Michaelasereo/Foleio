import Link from 'next/link';
import { ArrowLink, LogoMark, frame } from './ui';

const column = 'flex min-w-0 flex-[1_1_130px] flex-col gap-2.5 text-[#3b3a36]';

export function LandingFooter() {
  return (
    <div className={frame}>
      <div className="flex flex-wrap gap-x-12 gap-y-9 border-t border-[#ebeae5] pb-11 pt-10 text-[14px]">
        <div className="min-w-0 flex-[2_1_240px]">
          <div className="flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.02em]">
            <LogoMark className="h-[26px] w-[26px]" />
            <span>Foleio</span>
          </div>
          <p className="mt-[14px] text-[#6b6a64]">© 2026 Foleio. Lagos, Nigeria.</p>
        </div>
        <div className={column}>
          <div className="text-[#6b6a64]">Product</div>
          <Link href="/product/link">Link</Link>
          <Link href="/product/bookings">Bookings</Link>
          <Link href="/product/shop">Shop</Link>
          <Link href="/creators">Creators</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className={column}>
          <div className="text-[#6b6a64]">Company</div>
          <Link href="/about">About</Link>
          <a href="mailto:hello@foleio.com">Contact</a>
        </div>
        <div className={column}>
          <div className="text-[#6b6a64]">Legal</div>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/data-policy">Data Policy</Link>
          <Link href="/legal/creator-agreement">Creator Agreement</Link>
        </div>
        <div className={column}>
          <div className="text-[#6b6a64]">Social</div>
          <ArrowLink href="https://instagram.com/foleiohq" className="" external>
            Instagram
          </ArrowLink>
          <ArrowLink href="https://x.com/foleiohq" className="" external>
            X
          </ArrowLink>
          <ArrowLink href="https://tiktok.com/@foleiohq" className="" external>
            TikTok
          </ArrowLink>
        </div>
      </div>
    </div>
  );
}
