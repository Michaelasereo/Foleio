import styles from './landing.module.css';
import { Italic, LogoMark, Pill, frame } from './ui';

export function ClosingCta() {
  return (
    <div className={`${frame}`}>
      <div className="mt-[72px] border-t border-[#ebeae5] pb-[76px] pt-[72px] text-center">
        <LogoMark className="h-[72px] w-[72px]" />
        <h2 className="mx-auto mt-8 max-w-[760px] text-[clamp(36px,4.6vw,62px)] font-[450] leading-[1.04] tracking-[-0.04em] text-[#1c1b19]">
          Your Foleio is <Italic>ready when you are.</Italic>
        </h2>
        <p className="mx-auto mt-5 max-w-[480px] text-[18px] text-[#55544f]">
          Create your page, add what you sell, connect your bank, and share your link.
        </p>
        <div className="mt-7">
          <Pill href="/signup" className="min-h-[46px] px-[22px] text-[16px] tracking-[-0.01em]">
            Request invite
          </Pill>
        </div>
        <p className="mt-4 text-[14px] text-[#6b6a64]">
          Free plan, ₦0 a month. Upgrade only when it saves you money.
        </p>
        <p className={`${styles.serif} mt-7 text-[26px] text-[#3b3a36]`}>
          Your work. Your world. Your Foleio.
        </p>
      </div>
    </div>
  );
}
