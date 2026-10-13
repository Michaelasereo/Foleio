import { Link2 } from 'lucide-react';
import { Italic, frame } from './ui';

export function Gap() {
  return (
    <div className={`${frame} pt-14 min-[761px]:pt-[88px]`}>
      <div className="flex flex-wrap items-center gap-x-16 gap-y-12 rounded-[36px] bg-[#131210] px-[clamp(28px,6vw,88px)] py-[clamp(40px,5vw,72px)] text-white">
        <div className="min-w-0 flex-[1_1_460px]">
          <div className="text-[15px] text-[#d6d4cd]">The gap</div>
          <h2 className="m-0 mt-4 text-[clamp(32px,3.5vw,50px)] font-[450] leading-[1.08] tracking-[-0.035em] text-white">
            Your work looks professional. <Italic>Getting paid for it doesn&apos;t.</Italic>
          </h2>
          <p className="mt-7 max-w-[560px] text-[18px] leading-[1.6] text-[#a9a7a0]">
            Right now a booking is a DM, then a WhatsApp chat, then an account number, then{' '}
            <span className="text-white">a screenshot of a transfer you still have to check</span>.
            Your prices live in a highlight. Your calendar lives in your head. Your link in bio
            sends people everywhere except somewhere they can pay.
          </p>
          <p className="mt-[18px] max-w-[560px] text-[18px] leading-[1.6] text-[#a9a7a0]">
            You end up as your own receptionist, cashier, and debt collector.{' '}
            <span className="text-white">Foleio replaces all of it with one link.</span>
          </p>
        </div>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5 text-[14px]">
          <div className="max-w-[280px] self-start rounded-[16px] bg-[#24231f] px-[14px] py-2.5 text-[#d6d4cd]">
            <div className="text-[11px] text-[#a9a7a0]">Instagram DM</div>
            Hi, how much for bridal?
          </div>
          <div className="max-w-[280px] self-end rounded-[16px] bg-[#24231f] px-[14px] py-2.5 text-[#d6d4cd]">
            <div className="text-[11px] text-[#a9a7a0]">WhatsApp</div>
            Please send your account number
          </div>
          <div className="max-w-[280px] self-start rounded-[16px] bg-[#24231f] px-[14px] py-2.5 text-[#d6d4cd]">
            <div className="text-[11px] text-[#a9a7a0]">WhatsApp</div>
            Sent. See the screenshot.
          </div>
          <div className="max-w-[280px] self-end rounded-[16px] bg-[#24231f] px-[14px] py-2.5 text-[#d6d4cd]">
            <div className="text-[11px] text-[#a9a7a0]">Notes app</div>
            Price list, updated last month
          </div>
          <div className="my-1.5 self-center text-[18px] text-[#a9a7a0]">↓</div>
          <div className="flex items-center justify-between gap-3 self-stretch rounded-[16px] bg-[#f2f1ec] py-2.5 pl-[14px] pr-2.5 text-[#131210]">
            <div className="min-w-0">
              <div className="text-[11px] text-[#6b6a64]">One link</div>
              <span className="font-medium">foleio.com/creator/adaeze</span>
            </div>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#131210] text-[#f2f1ec]">
              <Link2 aria-hidden="true" size={16} strokeWidth={2} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
