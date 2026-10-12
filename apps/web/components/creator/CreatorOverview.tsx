'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
  CreditCard,
  FileText,
  LayoutGrid,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react';
import styles from '@/components/demo/demo-dashboard.module.css';
import { HeroArt, NotifyArt } from '@/components/creator/overview-art';

const SLIDES = [
  {
    title: 'Run bookings, shop, and payouts in one place',
    body: 'A placeholder home for the new dashboard. Live bookings, orders, and earnings connect here once this layout feels right.',
  },
  {
    title: 'See who is booked before the week starts',
    body: 'Upcoming appointments, deposits, and balances will sit in this banner when the dashboard is wired up.',
  },
  {
    title: 'Know what has settled to your bank',
    body: 'Earnings stay as sample copy for now. Real figures replace them when you connect this page.',
  },
];

export function CreatorOverview({ publicPath }: { publicPath: string }) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [vote, setVote] = useState<'yes' | 'no' | null>(null);
  const [comment, setComment] = useState('');
  const [whyOpen, setWhyOpen] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const current = SLIDES[slide];

  function go(href: string) {
    router.push(href);
  }

  async function shareProfile() {
    const url = `${window.location.origin}${publicPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function submitFeedback(event: FormEvent) {
    event.preventDefault();
    if (!vote) return;
    setFeedbackSent(true);
  }

  return (
    <div
      className={styles.shell}
      style={{
        display: 'block',
        minHeight: 0,
        width: '100%',
        background: 'transparent',
      }}
    >
      <div className={styles.content} style={{ padding: '4px 0 48px' }}>
        <section className={styles.hero} aria-roledescription="carousel" aria-label="Dashboard intro">
          <div className={styles.heroCopy}>
            <h1>{current.title}</h1>
            <p>{current.body}</p>
            <div className={styles.heroActions}>
              <button type="button" className={styles.heroPrimary} onClick={() => void shareProfile()}>
                {copied ? 'Copied' : 'Share profile'}
              </button>
              <button type="button" className={styles.heroGhost} onClick={() => go('/bookings')}>
                Get started here
                <ArrowRight strokeWidth={1.75} />
              </button>
            </div>
            <div className={styles.dots}>
              {SLIDES.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  className={`${styles.dot} ${index === slide ? styles.dotOn : ''}`}
                  aria-label={`Show intro ${index + 1}`}
                  aria-current={index === slide ? 'true' : undefined}
                  onClick={() => setSlide(index)}
                />
              ))}
            </div>
          </div>
          <HeroArt />
        </section>

        <section className={styles.section} aria-labelledby="quick-start">
          <h2 id="quick-start">Quick start</h2>
          <h3 className={styles.subhead}>Products</h3>
          <div className={styles.products}>
            <Product icon={CalendarDays} title="Bookings" body="Services, availability, and the appointments on your calendar." onOpen={() => go('/bookings')}>
              <Phone label="Bookings">
                <div className={styles.phoneRow}>
                  <strong>Sample client</strong>
                  <span>Silk press · Thu 12 Oct</span>
                  <div className={styles.amount}>₦85,000</div>
                </div>
                <div className={styles.phoneRow}>
                  <strong>Sample client</strong>
                  <span>Makeup · Sat 14 Oct</span>
                  <div className={styles.amount}>₦40,000</div>
                </div>
              </Phone>
            </Product>
            <Product icon={ShoppingBag} title="Shop" body="Products, orders, and delivery once your shop is connected." onOpen={() => go('/shop')}>
              <Phone label="Order">
                <div className={styles.phoneRow}>
                  <strong>Sample product</strong>
                  <span>Qty 1 · paid</span>
                  <div className={styles.amount}>₦18,500</div>
                </div>
                <div className={styles.phoneRow}>
                  <strong>Sample product</strong>
                  <span>Preorder</span>
                  <div className={styles.amount}>₦32,000</div>
                </div>
              </Phone>
            </Product>
            <Product icon={Wallet} title="Earnings" body="What you have made, and what is still on the way to your bank." onOpen={() => go('/earnings')}>
              <Phone label="This month">
                <div className={styles.phoneRow}>
                  <strong>₦128,400</strong>
                  <span>Sample total</span>
                  <div className={styles.bar}>
                    <span style={{ width: '72%' }} />
                  </div>
                </div>
                <div className={styles.phoneRow}>
                  <strong>₦24,000</strong>
                  <span>In transit</span>
                  <div className={styles.bar}>
                    <span style={{ width: '28%' }} />
                  </div>
                </div>
              </Phone>
            </Product>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="use-cases">
          <h2 id="use-cases">Use cases</h2>
          <div className={styles.uses}>
            <Use icon={Sparkles} tone={styles.toneOrange} title="Services" body="List what clients can book and the price you set." onOpen={() => go('/bookings?tab=services')} />
            <Use icon={CreditCard} tone={styles.toneBlue} title="Deposits" body="Hold a deposit now and collect the balance later." onOpen={() => go('/bookings')} />
            <Use icon={Package} tone={styles.toneGreen} title="Products" body="Sell from your shop and track each order." onOpen={() => go('/shop')} />
            <Use icon={Receipt} tone={styles.toneRose} title="Invoices" body="Send a quote when the price is not on your list." onOpen={() => go('/invoices')} />
            <Use icon={LayoutGrid} tone={styles.toneViolet} title="Portfolio" body="The work clients see on your public page." onOpen={() => go('/settings?tab=portfolio')} />
          </div>
        </section>

        <section className={styles.section} aria-labelledby="studio-tools">
          <h2 id="studio-tools">Studio tools</h2>
          <div className={styles.tools}>
            <button type="button" className={styles.tool} onClick={() => go('/settings?tab=portfolio')}>
              <h3>Portfolio</h3>
              <p>A gallery placeholder for the work on your public page.</p>
              <span className={styles.toolButton}>Open portfolio</span>
              <ToolArt variant="portfolio" />
            </button>
            <button type="button" className={styles.tool} onClick={() => go('/invoices')}>
              <h3>Quotes</h3>
              <p>Draft a custom quote without adding it to your price list.</p>
              <span className={styles.toolButton}>Open quotes</span>
              <ToolArt variant="quotes" />
            </button>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="quick-links">
          <h2 id="quick-links">Quick links</h2>
          <div className={styles.links}>
            <QuickLink icon={CalendarDays} title="Bookings" body="Upcoming appointments and what is still unpaid." onOpen={() => go('/bookings')} />
            <QuickLink icon={Package} title="Orders" body="Shop orders waiting to be packed or delivered." onOpen={() => go('/shop?tab=orders')} />
            <QuickLink icon={Wallet} title="Earnings" body="What you have made, and what has reached your bank." onOpen={() => go('/earnings')} />
            <QuickLink icon={Clock} title="Availability" body="The days and hours clients can book." onOpen={() => go('/bookings?tab=availability')} />
            <QuickLink icon={FileText} title="Invoices" body="Quotes you have sent and what was accepted." onOpen={() => go('/invoices')} />
            <QuickLink icon={Settings} title="Settings" body="Profile, bank, and plan." onOpen={() => go('/settings')} />
          </div>
        </section>

        <section className={styles.notify} aria-labelledby="notify">
          <div>
            <h2 id="notify">Get notified in real time</h2>
            <p>New bookings, orders, and payouts show up as they happen.</p>
          </div>
          <NotifyArt />
        </section>

        <section className={styles.help} aria-labelledby="help-title">
          <div className={styles.helpHead}>
            <h2 id="help-title">Did this page help you?</h2>
            <button type="button" className={styles.why} onClick={() => setWhyOpen(!whyOpen)}>
              Why should I leave a comment?
            </button>
          </div>
          {whyOpen ? (
            <p className={styles.whyNote}>
              Comments stay in this browser session so you can react to the layout. They are not stored.
            </p>
          ) : null}
          {feedbackSent ? (
            <p className={styles.thanks}>Thanks. That note stays on this page only.</p>
          ) : (
            <form className={styles.feedbackRow} onSubmit={submitFeedback}>
              <div className={styles.choice} role="group" aria-label="Was this page helpful?">
                <button type="button" aria-pressed={vote === 'yes'} onClick={() => setVote('yes')}>
                  Yes
                </button>
                <button type="button" aria-pressed={vote === 'no'} onClick={() => setVote('no')}>
                  No
                </button>
              </div>
              <input
                className={styles.comment}
                value={comment}
                placeholder="Leave a comment"
                aria-label="Leave a comment"
                onChange={(event) => setComment(event.target.value)}
              />
              <button type="submit" className={styles.feedbackSubmit} disabled={!vote}>
                Submit
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function Product({
  icon: Icon,
  title,
  body,
  onOpen,
  children,
}: {
  icon: typeof CalendarDays;
  title: string;
  body: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <article>
      <h3 className={styles.productTitle}>
        <span className={styles.badge}>
          <Icon strokeWidth={1.75} />
        </span>
        {title}
      </h3>
      <p className={styles.blurb}>{body}</p>
      <button type="button" className={styles.textLink} onClick={onOpen}>
        Learn more
        <ArrowRight strokeWidth={1.75} />
      </button>
      {children}
    </article>
  );
}

function Phone({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.phone}>
        <p className={styles.phoneLabel}>{label}</p>
        {children}
      </div>
    </div>
  );
}

function Use({
  icon: Icon,
  tone,
  title,
  body,
  onOpen,
}: {
  icon: typeof Sparkles;
  tone: string;
  title: string;
  body: string;
  onOpen: () => void;
}) {
  return (
    <article>
      <h3 className={styles.useTitle}>
        <span className={`${styles.useIcon} ${tone}`}>
          <Icon strokeWidth={1.75} />
        </span>
        {title}
      </h3>
      <p className={styles.blurb}>{body}</p>
      <button type="button" className={styles.textLink} onClick={onOpen}>
        Start here
        <ArrowRight strokeWidth={1.75} />
      </button>
    </article>
  );
}

function QuickLink({
  icon: Icon,
  title,
  body,
  onOpen,
}: {
  icon: typeof CalendarDays;
  title: string;
  body: string;
  onOpen: () => void;
}) {
  return (
    <button type="button" className={styles.linkCard} onClick={onOpen}>
      <ArrowUpRight className={styles.linkArrow} strokeWidth={1.75} />
      <div className={styles.linkTop}>
        <span className={styles.linkIcon}>
          <Icon strokeWidth={1.75} />
        </span>
        <h3>{title}</h3>
      </div>
      <p>{body}</p>
    </button>
  );
}

function ToolArt({ variant }: { variant: 'portfolio' | 'quotes' }) {
  const main = variant === 'portfolio' ? '#b9ccff' : '#d5e2ff';
  return (
    <svg className={styles.toolArt} viewBox="0 0 180 120" aria-hidden="true">
      <rect x="78" y="28" width="86" height="64" rx="10" fill={main} />
      <rect x="92" y="42" width="58" height="8" rx="4" fill="#fff" />
      <rect x="92" y="56" width="40" height="6" rx="3" fill="#eef3ff" />
      <circle cx="46" cy="78" r="28" fill="#dbe6ff" />
      <path d="M20 108h140" stroke="#c5d4f7" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
