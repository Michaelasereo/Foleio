import styles from './landing.module.css';
import { Italic, frame } from './ui';

const QUESTIONS = [
  {
    q: 'How do I get paid?',
    a: 'Your share of each payment settles directly to the Nigerian bank account you link.',
    open: true,
  },
  {
    q: 'Can I take a deposit instead of full payment?',
    a: 'Yes. You choose a deposit or full payment for each service. The balance is due before the booking date, seven days by default, and your client gets a reminder.',
  },
  {
    q: 'What happens if a client cancels?',
    a: 'You set your own cancellation and refund policy. Clients see it before they pay.',
  },
  {
    q: 'Do my clients need a Foleio account?',
    a: 'No. They open your link, choose what they want, and pay.',
  },
  {
    q: 'What do I need to get started?',
    a: 'You need to be 18 or older and have a Nigerian bank account in your own name.',
  },
  {
    q: 'Who handles the payments?',
    a: 'Paystack processes every payment. Clients can pay by card, bank, and other Paystack channels. Foleio never stores card details.',
  },
  {
    q: 'Is Foleio available outside Nigeria?',
    a: 'Not yet. Foleio is currently for creators based in Nigeria.',
  },
  {
    q: 'Can I cancel Pro?',
    a: "Any time. You keep Pro until the end of the period you've paid for, then move back to Free.",
  },
] as const;

export function Faq() {
  return (
    <div className={`${frame} flex flex-wrap gap-x-16 gap-y-8 pt-[88px] text-[17px]`}>
      <div className="min-w-0 flex-[1_1_360px]">
        <h2 className="m-0 text-[clamp(32px,3.5vw,50px)] font-[450] leading-[1.08] tracking-[-0.035em] text-[#1c1b19]">
          Questions, <Italic>answered.</Italic>
        </h2>
      </div>
      <div className="min-w-0 flex-[1.4_1_480px]">
        {QUESTIONS.map((item, index) => (
          <details
            key={item.q}
            open={'open' in item ? true : undefined}
            className={index === QUESTIONS.length - 1 ? undefined : 'border-b border-[#ebeae5]'}
          >
            <summary className="flex min-h-16 items-center justify-between gap-4 font-medium tracking-[-0.015em]">
              <span>{item.q}</span>
              <span
                className={`${styles.plus} inline-block text-[22px] font-light leading-none text-[#6b6a64]`}
              >
                +
              </span>
            </summary>
            <p className="m-0 pb-[22px] pr-10 text-[15px] leading-[1.6] text-[#6b6a64]">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
