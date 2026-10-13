import { Italic, Pill, Serif, frame } from './ui';

const STEPS = [
  {
    n: '1',
    title: 'Create your page.',
    body: 'Pick your name and add your photo and bio.',
  },
  {
    n: '2',
    title: 'Add what you sell.',
    body: 'Services or products, each at your price.',
  },
  {
    n: '3',
    title: 'Connect your bank.',
    body: 'A Nigerian account in your name.',
  },
  {
    n: '4',
    title: 'Share your link.',
    body: 'Instagram, WhatsApp, TikTok, anywhere.',
  },
] as const;

export function Setup() {
  return (
    <div className="mt-14 bg-[#f2f1ec] min-[761px]:mt-[88px]">
      <div className={`${frame} py-[72px]`}>
        <div className="text-[15px] text-[#55544f]">Live in minutes</div>
        <h2 className="m-0 mt-[14px] text-[clamp(32px,3.5vw,50px)] font-[450] leading-[1.08] tracking-[-0.035em] text-[#1c1b19]">
          Four steps. <Italic>Then share your link.</Italic>
        </h2>
        <div className="mt-9 flex flex-wrap gap-7">
          {STEPS.map((step) => (
            <div key={step.n} className="min-w-0 flex-[1_1_220px] border-t border-[#dcdbd5] pt-4">
              <Serif className="text-[30px] leading-none text-[#6b6a64]">{step.n}</Serif>
              <div className="mt-2.5 font-medium">{step.title}</div>
              <p className="mt-1 text-[15px] text-[#55544f]">{step.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <div className="flex min-h-[46px] max-w-full min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-full bg-white py-2 pl-[18px] pr-2 text-[15px] shadow-[0_0_0_1px_rgba(19,18,16,0.06)]">
            <span className="min-w-0 font-medium break-all">foleio.com/creator/adaeze</span>
            <span className="pr-2 text-[12px] font-medium text-[#0b8043]">✓ Ready to share</span>
          </div>
          <Pill href="/signup" className="min-h-[46px] px-[22px] text-[16px] tracking-[-0.01em]">
            Request invite
          </Pill>
        </div>
      </div>
    </div>
  );
}
