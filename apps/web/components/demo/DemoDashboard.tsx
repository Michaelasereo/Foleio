'use client';

import { HeroArt, NotifyArt } from '@/components/creator/overview-art';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  FileText,
  House,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Mail,
  Package,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import styles from './demo-dashboard.module.css';

type SectionId =
  | 'dashboard'
  | 'overview'
  | 'bookings'
  | 'availability'
  | 'shop'
  | 'shop-products'
  | 'shop-orders'
  | 'shop-coupons'
  | 'invoices'
  | 'earnings'
  | 'payouts'
  | 'newsletter'
  | 'profile'
  | 'account'
  | 'settings';

const SEARCH_ITEMS: { id: SectionId; label: string; hint: string }[] = [
  { id: 'dashboard', label: 'Dashboard', hint: 'Bookings, earnings, and what is coming up' },
  { id: 'overview', label: 'Overview', hint: 'Start here' },
  { id: 'bookings', label: 'Bookings', hint: 'Appointments and services' },
  { id: 'availability', label: 'Availability', hint: 'Hours clients can book' },
  { id: 'shop', label: 'Shop', hint: 'Products and orders' },
  { id: 'shop-orders', label: 'Orders', hint: 'Shop orders' },
  { id: 'invoices', label: 'Quotes & invoices', hint: 'Custom pricing' },
  { id: 'earnings', label: 'Earnings', hint: 'Sample totals' },
  { id: 'payouts', label: 'Payouts', hint: 'Bank settlements' },
  { id: 'newsletter', label: 'Newsletters', hint: 'Issues and readers' },
  { id: 'profile', label: 'Profile settings', hint: 'Name, photo, and public page' },
  { id: 'account', label: 'Account settings', hint: 'Email, password, and plan' },
  { id: 'settings', label: 'Settings', hint: 'Profile and plan' },
];

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

function navCurrent(active: SectionId, id: string) {
  if (active === id) return true;
  if (id === 'bookings' && active === 'availability') return true;
  if (id === 'shop' && active.startsWith('shop')) return true;
  return false;
}

const DEMO_SECTIONS: SectionId[] = [
  'dashboard',
  'overview',
  'bookings',
  'availability',
  'shop',
  'shop-products',
  'shop-orders',
  'shop-coupons',
  'invoices',
  'earnings',
  'payouts',
  'newsletter',
  'profile',
  'account',
  'settings',
];

function isDemoSection(value: string | undefined): value is SectionId {
  return !!value && DEMO_SECTIONS.includes(value as SectionId);
}

export function DemoDashboard({
  initialSection,
  embedded,
}: {
  initialSection?: string;
  embedded?: 'app' | 'page' | 'full';
} = {}) {
  const start = isDemoSection(initialSection) ? initialSection : 'dashboard';
  const [active, setActive] = useState<SectionId>(start);
  const [shopOpen, setShopOpen] = useState(start.startsWith('shop'));
  const [slide, setSlide] = useState(0);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bannerNote, setBannerNote] = useState('');
  const [vote, setVote] = useState<'yes' | 'no' | null>(null);
  const [comment, setComment] = useState('');
  const [whyOpen, setWhyOpen] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountNote, setAccountNote] = useState('');
  const accountRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_ITEMS;
    return SEARCH_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q)
    );
  }, [query]);

  function select(id: SectionId) {
    setActive(id);
    if (id.startsWith('shop')) setShopOpen(true);
    setSearchOpen(false);
    setQuery('');
    setBannerNote('');
    if (!embedded) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function submitFeedback(event: FormEvent) {
    event.preventDefault();
    if (!vote) return;
    setFeedbackSent(true);
  }

  async function copyProfile() {
    try {
      await navigator.clipboard.writeText('https://foleio.com/creator/adaeze');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setBannerNote('Could not copy the link from this browser.');
    }
  }

  useEffect(() => {
    if (!accountOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen]);

  const current = SLIDES[slide];

  return (
    <div
      className={`${styles.shell} ${embedded === 'page' ? styles.shellEmbed : ''} ${embedded === 'app' ? styles.shellEmbedApp : ''} ${embedded === 'full' ? styles.shellEmbedFull : ''}`}
    >
      <aside className={styles.sidebar}>
        <div className={styles.account} ref={accountRef}>
          <button
            type="button"
            className={styles.accountButton}
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            onClick={() => setAccountOpen((open) => !open)}
          >
            <span className={styles.accountAvatar} aria-hidden="true">
              AO
            </span>
            <span className={styles.accountName}>Adaeze Okoro</span>
            <ChevronDown
              className={`${styles.chevron} ${accountOpen ? styles.chevronOpen : ''}`}
              strokeWidth={1.75}
            />
          </button>
          {accountOpen ? (
            <div className={styles.accountMenu} role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAccountOpen(false);
                  select('profile');
                }}
              >
                Profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAccountOpen(false);
                  setAccountNote('Sign out is not connected in this demo.');
                }}
              >
                Sign out
              </button>
            </div>
          ) : null}
          {accountNote ? <p className={styles.accountNote}>{accountNote}</p> : null}
        </div>
        <nav aria-label="Dashboard">
          <p className={`${styles.groupLabel} ${styles.groupLabelFirst}`}>Overview</p>
          <div className={styles.nav}>
            <button
              type="button"
              className={styles.navItem}
              aria-current={active === 'overview' ? 'page' : undefined}
              onClick={() => select('overview')}
            >
              <House className={styles.navIcon} strokeWidth={1.75} />
              Overview
            </button>
            <button
              type="button"
              className={styles.navItem}
              aria-current={active === 'dashboard' ? 'page' : undefined}
              onClick={() => select('dashboard')}
            >
              <LayoutDashboard className={styles.navIcon} strokeWidth={1.75} />
              Dashboard
            </button>
          </div>

          <p className={styles.groupLabel}>Creator</p>
          <div className={styles.nav}>
            <button
              type="button"
              className={styles.navItem}
              aria-current={navCurrent(active, 'bookings') ? 'page' : undefined}
              onClick={() => select('bookings')}
            >
              <CalendarDays className={styles.navIcon} strokeWidth={1.75} />
              Bookings
            </button>
            <button
              type="button"
              className={styles.navItem}
              aria-current={navCurrent(active, 'shop') ? 'page' : undefined}
              aria-expanded={shopOpen}
              onClick={() => {
                if (active.startsWith('shop')) {
                  setShopOpen((open) => !open);
                  return;
                }
                setShopOpen(true);
                select('shop');
              }}
            >
              <ShoppingBag className={styles.navIcon} strokeWidth={1.75} />
              Shop
              <ChevronDown
                className={`${styles.chevron} ${shopOpen ? styles.chevronOpen : ''}`}
                strokeWidth={1.75}
              />
            </button>
            {shopOpen ? (
              <div className={styles.subNav}>
                {(
                  [
                    ['shop-products', 'Products'],
                    ['shop-orders', 'Orders'],
                    ['shop-coupons', 'Coupons'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={styles.subItem}
                    aria-current={active === id ? 'page' : undefined}
                    onClick={() => select(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className={styles.navItem}
              aria-current={active === 'newsletter' ? 'page' : undefined}
              onClick={() => select('newsletter')}
            >
              <Mail className={styles.navIcon} strokeWidth={1.75} />
              Newsletters
            </button>
            <button
              type="button"
              className={styles.navItem}
              aria-current={active === 'invoices' ? 'page' : undefined}
              onClick={() => select('invoices')}
            >
              <FileText className={styles.navIcon} strokeWidth={1.75} />
              Quotes and invoices
            </button>
          </div>

          <p className={styles.groupLabel}>Earnings</p>
          <div className={styles.nav}>
            <button
              type="button"
              className={styles.navItem}
              aria-current={active === 'earnings' ? 'page' : undefined}
              onClick={() => select('earnings')}
            >
              <Wallet className={styles.navIcon} strokeWidth={1.75} />
              Earnings
            </button>
            <button
              type="button"
              className={styles.navItem}
              aria-current={active === 'payouts' ? 'page' : undefined}
              onClick={() => select('payouts')}
            >
              <Landmark className={styles.navIcon} strokeWidth={1.75} />
              Payouts
            </button>
          </div>

          <p className={styles.groupLabel}>Accounts</p>
          <div className={styles.nav}>
            <button
              type="button"
              className={styles.navItem}
              aria-current={active === 'profile' ? 'page' : undefined}
              onClick={() => select('profile')}
            >
              <User className={styles.navIcon} strokeWidth={1.75} />
              Profile settings
            </button>
            <button
              type="button"
              className={styles.navItem}
              aria-current={active === 'account' ? 'page' : undefined}
              onClick={() => select('account')}
            >
              <Settings className={styles.navIcon} strokeWidth={1.75} />
              Account settings
            </button>
          </div>
        </nav>

        <div className={styles.sideFoot}>
          <button type="button" className={styles.sideLink} onClick={() => select('overview')}>
            Demo
          </button>
          <button
            type="button"
            className={styles.sideLink}
            onClick={() => {
              if (active !== 'overview') setActive('overview');
              window.setTimeout(() => {
                document.getElementById('demo-feedback')?.scrollIntoView({ behavior: 'smooth' });
              }, 60);
            }}
          >
            Help
          </button>
          <button
            type="button"
            className={styles.sideLink}
            onClick={() =>
              setStatusNote(
                statusNote ? '' : 'Sample data only. Nothing on this page is saved or sent.'
              )
            }
          >
            Status
          </button>
        </div>
        {statusNote ? <p className={styles.blurb}>{statusNote}</p> : null}
      </aside>

      <div className={styles.main}>
        <header className={`${styles.topbar} ${active === 'dashboard' ? styles.topbarDash : ''}`}>
          <div className={styles.searchWrap}>
            <label className={styles.search}>
              <input
                value={query}
                placeholder={
                  active === 'dashboard' ? 'Search bookings, clients, and orders' : 'Search here...'
                }
                aria-label="Search the demo dashboard"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setSearchOpen(false), 120);
                }}
              />
              <Search strokeWidth={1.75} />
            </label>
            {searchOpen ? (
              <div className={styles.results} role="listbox" aria-label="Search results">
                {results.length === 0 ? (
                  <div className={styles.result}>
                    <strong>No matches</strong>
                    <span>Try bookings, shop, or earnings.</span>
                  </div>
                ) : (
                  results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.result}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => select(item.id)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.hint}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <div className={styles.shareSlot}>
            <div className={styles.shareRow}>
              {active === 'dashboard' ? (
                <div className={styles.profileChip}>
                  <span>foleio.com/creator/adaeze</span>
                  <button type="button" onClick={() => void copyProfile()}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                className={styles.share}
                onClick={() =>
                  setBannerNote(
                    'Share profile is a placeholder. Your public link is not connected yet.'
                  )
                }
              >
                Share profile
              </button>
            </div>
            {bannerNote ? (
              <p className={styles.shareNote} role="status">
                {bannerNote}
              </p>
            ) : null}
          </div>
        </header>

        <div className={`${styles.content} ${active === 'overview' ? '' : styles.contentWide}`}>
          {active === 'dashboard' ? (
            <DashboardPage onSelect={select} />
          ) : active === 'overview' ? (
            <Overview
              slide={slide}
              title={current.title}
              body={current.body}
              onSlide={setSlide}
              onSelect={select}
              vote={vote}
              setVote={setVote}
              comment={comment}
              setComment={setComment}
              whyOpen={whyOpen}
              setWhyOpen={setWhyOpen}
              feedbackSent={feedbackSent}
              onFeedback={submitFeedback}
            />
          ) : (
            <OtherDemoPage section={active} onSelect={select} />
          )}
        </div>
      </div>
    </div>
  );
}

function Overview({
  slide,
  title,
  body,
  onSlide,
  onSelect,
  vote,
  setVote,
  comment,
  setComment,
  whyOpen,
  setWhyOpen,
  feedbackSent,
  onFeedback,
}: {
  slide: number;
  title: string;
  body: string;
  onSlide: (index: number) => void;
  onSelect: (id: SectionId) => void;
  vote: 'yes' | 'no' | null;
  setVote: (value: 'yes' | 'no') => void;
  comment: string;
  setComment: (value: string) => void;
  whyOpen: boolean;
  setWhyOpen: (value: boolean) => void;
  feedbackSent: boolean;
  onFeedback: (event: FormEvent) => void;
}) {
  return (
    <>
      <section className={styles.hero} aria-roledescription="carousel" aria-label="Dashboard intro">
        <div className={styles.heroCopy}>
          <h1>{title}</h1>
          <p>{body}</p>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.heroPrimary}
              onClick={() => onSelect('settings')}
            >
              Share profile
            </button>
            <button type="button" className={styles.heroGhost} onClick={() => onSelect('bookings')}>
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
                onClick={() => onSlide(index)}
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
          <Product
            icon={CalendarDays}
            title="Bookings"
            body="Services, availability, and the appointments on your calendar."
            onOpen={() => onSelect('bookings')}
          >
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
          <Product
            icon={ShoppingBag}
            title="Shop"
            body="Products, orders, and delivery once your shop is connected."
            onOpen={() => onSelect('shop')}
          >
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
          <Product
            icon={Wallet}
            title="Earnings"
            body="What you have made, and what is still on the way to your bank."
            onOpen={() => onSelect('earnings')}
          >
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
          <Use
            icon={Sparkles}
            tone={styles.toneOrange}
            title="Services"
            body="List what clients can book and the price you set."
            onOpen={() => onSelect('bookings')}
          />
          <Use
            icon={CreditCard}
            tone={styles.toneBlue}
            title="Deposits"
            body="Hold a deposit now and collect the balance later."
            onOpen={() => onSelect('bookings')}
          />
          <Use
            icon={Package}
            tone={styles.toneGreen}
            title="Products"
            body="Sell from your shop and track each order."
            onOpen={() => onSelect('shop-products')}
          />
          <Use
            icon={Receipt}
            tone={styles.toneRose}
            title="Invoices"
            body="Send a quote when the price is not on your list."
            onOpen={() => onSelect('invoices')}
          />
          <Use
            icon={LayoutGrid}
            tone={styles.toneViolet}
            title="Portfolio"
            body="The work clients see on your public page."
            onOpen={() => onSelect('settings')}
          />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="studio-tools">
        <h2 id="studio-tools">Studio tools</h2>
        <div className={styles.tools}>
          <button type="button" className={styles.tool} onClick={() => onSelect('settings')}>
            <h3>Portfolio</h3>
            <p>A gallery placeholder for the work on your public page.</p>
            <span className={styles.toolButton}>Open portfolio</span>
            <ToolArt variant="portfolio" />
          </button>
          <button type="button" className={styles.tool} onClick={() => onSelect('invoices')}>
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
          <QuickLink
            icon={CalendarDays}
            title="Bookings"
            body="Upcoming appointments and what is still unpaid."
            onOpen={() => onSelect('bookings')}
          />
          <QuickLink
            icon={Package}
            title="Orders"
            body="Shop orders waiting to be packed or delivered."
            onOpen={() => onSelect('shop-orders')}
          />
          <QuickLink
            icon={Wallet}
            title="Earnings"
            body="Sample totals until live payouts are connected."
            onOpen={() => onSelect('earnings')}
          />
          <QuickLink
            icon={Clock}
            title="Availability"
            body="The days and hours clients can book."
            onOpen={() => onSelect('availability')}
          />
          <QuickLink
            icon={FileText}
            title="Invoices"
            body="Quotes you have sent and what was accepted."
            onOpen={() => onSelect('invoices')}
          />
          <QuickLink
            icon={Settings}
            title="Settings"
            body="Profile, bank, and plan. Still a placeholder."
            onOpen={() => onSelect('settings')}
          />
        </div>
      </section>

      <section className={styles.notify} aria-labelledby="notify">
        <div>
          <h2 id="notify">Get notified in real time</h2>
          <p>New bookings, orders, and payouts show up as they happen.</p>
        </div>
        <NotifyArt />
      </section>

      <section className={styles.help} id="demo-feedback" aria-labelledby="help-title">
        <div className={styles.helpHead}>
          <h2 id="help-title">Did this page help you?</h2>
          <button type="button" className={styles.why} onClick={() => setWhyOpen(!whyOpen)}>
            Why should I leave a comment?
          </button>
        </div>
        {whyOpen ? (
          <p className={styles.whyNote}>
            Comments stay in this browser session so you can react to the layout while you redesign
            it. They are not stored.
          </p>
        ) : null}
        {feedbackSent ? (
          <p className={styles.thanks}>Thanks. That note stays on this page only.</p>
        ) : (
          <form className={styles.feedbackRow} onSubmit={onFeedback}>
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
    </>
  );
}

const WEEK = [
  { day: 'Sat', date: '14', count: '1', current: true },
  { day: 'Sun', date: '15', count: '1', current: false },
  { day: 'Mon', date: '16', count: '—', current: false },
  { day: 'Tue', date: '17', count: '—', current: false },
  { day: 'Wed', date: '18', count: '1', current: false },
  { day: 'Thu', date: '19', count: '—', current: false },
  { day: 'Fri', date: '20', count: '—', current: false },
];

const BARS = [
  { label: '21 Sep', height: 46 },
  { label: '28 Sep', height: 62 },
  { label: '5 Oct', height: 50 },
  { label: '12 Oct', height: 68 },
  { label: '19 Oct', height: 74 },
  { label: '26 Oct', height: 82 },
  { label: '2 Nov', height: 90 },
  { label: '9 Nov', height: 100 },
];

const ORDER_WEEK = [
  { day: 'Sat', date: '14', count: '2', current: true },
  { day: 'Sun', date: '15', count: '1', current: false },
  { day: 'Mon', date: '16', count: '—', current: false },
  { day: 'Tue', date: '17', count: '1', current: false },
  { day: 'Wed', date: '18', count: '—', current: false },
  { day: 'Thu', date: '19', count: '2', current: false },
  { day: 'Fri', date: '20', count: '1', current: false },
];

function DashboardPage({ onSelect }: { onSelect: (id: SectionId) => void }) {
  const [mode, setMode] = useState<'bookings' | 'products' | 'newsletter'>('products');

  return (
    <div className={styles.home}>
      <header className={styles.greetRow}>
        <div className={styles.greet}>
          <h1>Good morning, Adaeze.</h1>
          <p>
            {mode === 'bookings'
              ? 'Friday 13 November. One booking tomorrow, and three things that need you.'
              : mode === 'products'
                ? 'Friday 13 November. Two orders to send today, and three things that need you.'
                : 'Friday 13 November. One issue goes out tomorrow, and three things that need you.'}
          </p>
        </div>
        <div className={styles.modeSwitch} role="group" aria-label="Dashboard type">
          <button
            type="button"
            aria-pressed={mode === 'bookings'}
            onClick={() => setMode('bookings')}
          >
            Bookings
          </button>
          <button
            type="button"
            aria-pressed={mode === 'products'}
            onClick={() => setMode('products')}
          >
            Products
          </button>
          <button
            type="button"
            aria-pressed={mode === 'newsletter'}
            onClick={() => setMode('newsletter')}
          >
            Newsletter
          </button>
        </div>
      </header>

      {mode === 'products' ? (
        <ProductsFill onSelect={onSelect} />
      ) : mode === 'newsletter' ? (
        <NewsletterFill onSelect={onSelect} />
      ) : (
        <BookingsFill onSelect={onSelect} />
      )}
    </div>
  );
}

function BookingsFill({ onSelect }: { onSelect: (id: SectionId) => void }) {
  return (
    <>
      <div className={styles.homeTop}>
        <section className={styles.nextCard}>
          <div className={styles.nextHead}>
            <span>Next up · tomorrow</span>
            <span className={styles.paidChip}>
              <Check strokeWidth={2} />
              Paid in full
            </span>
          </div>
          <h2>Bridal makeup for Chiamaka E.</h2>
          <p>Sat 14 Nov · 9:00 AM · Lekki, Lagos · ₦80,000</p>
          <div className={styles.days}>
            {WEEK.map((day) => (
              <div key={day.date} className={`${styles.day} ${day.current ? styles.dayOn : ''}`}>
                <span>{day.day}</span>
                <strong>{day.date}</strong>
                <span>{day.count}</span>
              </div>
            ))}
          </div>
          <div className={styles.nextActions}>
            <button
              type="button"
              className={styles.nextPrimary}
              onClick={() => onSelect('bookings')}
            >
              View booking
            </button>
            <button
              type="button"
              className={styles.nextGhost}
              onClick={() => onSelect('availability')}
            >
              Set your availability
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Notifications</h2>
            <span className={styles.count}>3</span>
          </div>
          <Need
            title="Balance due tomorrow"
            meta="Zainab M. · ₦40,000 · reminder sent Thursday"
            onOpen={() => onSelect('bookings')}
          />
          <Need
            title="Quote not paid yet"
            meta="Ngozi A. · ₦205,000 · sent Thursday"
            onOpen={() => onSelect('invoices')}
          />
          <Need
            title="Order to deliver"
            meta="Brush set · Amaka U. · Abuja"
            onOpen={() => onSelect('shop-orders')}
          />
        </section>
      </div>

      <div className={styles.homeMid}>
        <section className={styles.earn}>
          <div>
            <p className={styles.eyebrow}>Earnings this month</p>
            <p className={styles.big}>₦412,300</p>
            <p className={styles.quiet}>After fees, 13 days into November</p>
            <button type="button" className={styles.textLink} onClick={() => onSelect('earnings')}>
              Open earnings
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <div>
            <div className={styles.chartHead}>
              <span>Earnings by week</span>
              <strong>₦197,500 so far this week</strong>
            </div>
            <div className={styles.chart}>
              {BARS.map((bar, index) => (
                <div key={bar.label} className={styles.barCol}>
                  <span
                    className={`${styles.barFill} ${index === BARS.length - 1 ? styles.barNow : ''}`}
                    style={{ height: `${bar.height}%` }}
                  />
                  <span className={styles.barLabel}>{bar.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className={styles.miniStack}>
          <Mini label="Balances to collect" meta="2 bookings · next due tomorrow" value="₦80,000" />
          <Mini label="Upcoming bookings" meta="3 in the next 7 days" value="6" />
          <Mini label="Products sold" meta="9 orders this month" value="14" />
        </div>
      </div>

      <div className={styles.homeSplit}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Upcoming bookings</h2>
            <button type="button" className={styles.textLink} onClick={() => onSelect('bookings')}>
              View all 6
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <BookingRow
            initials="CE"
            tone={styles.toneViolet}
            name="Chiamaka E."
            service="Bridal makeup"
            when="Sat 14 Nov · 9:00 AM"
            amount="₦80,000"
            status="Paid in full"
            statusClass={styles.pillPaid}
          />
          <BookingRow
            initials="TA"
            tone={styles.toneOrange}
            name="Tolu A."
            service="Soft glam"
            when="Sun 15 Nov · 2:00 PM"
            amount="₦30,000"
            status="Paid in full"
            statusClass={styles.pillPaid}
          />
          <BookingRow
            initials="HB"
            tone={styles.toneBlue}
            name="Halima B."
            service="Bridal trial"
            when="Wed 18 Nov · 11:00 AM"
            amount="₦25,000"
            status="Paid in full"
            statusClass={styles.pillPaid}
          />
          <BookingRow
            initials="ZM"
            tone={styles.toneGreen}
            name="Zainab M."
            service="Bridal makeup"
            when="Sat 21 Nov · 8:00 AM"
            amount="₦40,000 of ₦80,000"
            status="Deposit paid"
            statusClass={styles.pillWait}
          />
          <BookingRow
            initials="IN"
            tone={styles.toneRose}
            name="Ifeoma N."
            service="Soft glam"
            when="Sun 22 Nov · 4:00 PM"
            amount="₦30,000"
            status="Paid in full"
            statusClass={styles.pillPaid}
          />
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Recent payments</h2>
            <span className={styles.quiet}>Access Bank ··2207</span>
          </div>
          <PayRow
            title="Bridal makeup deposit"
            meta="Today · ₦40,000 less ₦1,500 fee"
            amount="₦38,500"
          />
          <PayRow
            title="Lash kit order"
            meta="Thu 12 Nov · ₦21,000 less ₦835 fee"
            amount="₦20,165"
          />
          <PayRow title="Soft glam" meta="Wed 11 Nov · ₦30,000 less ₦1,150 fee" amount="₦28,850" />
          <div className={styles.proNote}>
            <p>
              You&apos;re on Free at 3.5% + ₦100. At this month&apos;s sales, Pro would cost you
              less.
            </p>
            <button type="button" onClick={() => onSelect('settings')}>
              See Pro
            </button>
          </div>
        </section>
      </div>

      <div className={styles.homeBottom}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Quotes and invoices</h2>
            <button type="button" className={styles.textLink} onClick={() => onSelect('invoices')}>
              Send a quote
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <QuoteRow
            title="Wedding party of six"
            meta="Ngozi A. · for Sat 12 Dec"
            amount="₦205,000"
            status="Not paid"
            statusClass={styles.pillWait}
          />
          <QuoteRow
            title="Two-day shoot, on location"
            meta="Studio Kemi · for Fri 4 Dec"
            amount="₦150,000"
            status="Paid"
            statusClass={styles.pillPaid}
          />
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Shop orders</h2>
            <button type="button" className={styles.textLink} onClick={() => onSelect('shop')}>
              Open shop
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <QuoteRow
            title="Brush set"
            meta="Amaka U. · delivery to Abuja"
            amount="₦15,500"
            status="To deliver"
            statusClass={styles.pillDeliver}
          />
          <QuoteRow
            title="Lash kit"
            meta="Kemi O. · delivery to Lagos"
            amount="₦21,000"
            status="Preorder"
            statusClass={styles.pillWait}
          />
        </section>
      </div>
    </>
  );
}

function ProductsFill({ onSelect }: { onSelect: (id: SectionId) => void }) {
  return (
    <>
      <div className={styles.homeTop}>
        <section className={styles.nextCard}>
          <div className={styles.nextHead}>
            <span>Next up · today</span>
            <span className={styles.paidChip}>
              <Check strokeWidth={2} />
              Paid
            </span>
          </div>
          <h2>Brush set for Amaka U.</h2>
          <p>Order #1042 · delivery to Abuja · ₦15,500</p>
          <div className={styles.days}>
            {ORDER_WEEK.map((day) => (
              <div key={day.date} className={`${styles.day} ${day.current ? styles.dayOn : ''}`}>
                <span>{day.day}</span>
                <strong>{day.date}</strong>
                <span>{day.count}</span>
              </div>
            ))}
          </div>
          <div className={styles.nextActions}>
            <button
              type="button"
              className={styles.nextPrimary}
              onClick={() => onSelect('shop-orders')}
            >
              View order
            </button>
            <button type="button" className={styles.nextGhost} onClick={() => onSelect('shop')}>
              Open shop
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Notifications</h2>
            <span className={styles.count}>3</span>
          </div>
          <Need
            title="Pack and send today"
            meta="Brush set · Amaka U. · Abuja"
            onOpen={() => onSelect('shop-orders')}
          />
          <Need
            title="Low stock"
            meta="Lash kit · 2 left"
            onOpen={() => onSelect('shop-products')}
          />
          <Need
            title="Preorder to confirm"
            meta="Silk bonnet · 4 buyers waiting"
            onOpen={() => onSelect('shop-orders')}
          />
        </section>
      </div>

      <div className={styles.homeMid}>
        <section className={styles.earn}>
          <div>
            <p className={styles.eyebrow}>Earnings this month</p>
            <p className={styles.big}>₦286,400</p>
            <p className={styles.quiet}>After fees, from 14 orders</p>
            <button type="button" className={styles.textLink} onClick={() => onSelect('earnings')}>
              Open earnings
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <div>
            <div className={styles.chartHead}>
              <span>Earnings by week</span>
              <strong>₦64,200 so far this week</strong>
            </div>
            <div className={styles.chart}>
              {BARS.map((bar, index) => (
                <div key={bar.label} className={styles.barCol}>
                  <span
                    className={`${styles.barFill} ${index === BARS.length - 1 ? styles.barNow : ''}`}
                    style={{ height: `${bar.height}%` }}
                  />
                  <span className={styles.barLabel}>{bar.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className={styles.miniStack}>
          <Mini label="Unpaid orders" meta="2 orders · oldest from Tuesday" value="₦36,500" />
          <Mini label="To deliver" meta="5 leaving this week" value="5" />
          <Mini label="Products sold" meta="14 orders this month" value="14" />
        </div>
      </div>

      <div className={styles.homeSplit}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Orders</h2>
            <button
              type="button"
              className={styles.textLink}
              onClick={() => onSelect('shop-orders')}
            >
              View all 8
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <BookingRow
            initials="AU"
            tone={styles.toneBlue}
            name="Amaka U."
            service="Brush set"
            when="Today · Abuja"
            amount="₦15,500"
            status="To deliver"
            statusClass={styles.pillDeliver}
          />
          <BookingRow
            initials="KO"
            tone={styles.toneOrange}
            name="Kemi O."
            service="Lash kit"
            when="Sat 14 Nov · Lagos"
            amount="₦21,000"
            status="Preorder"
            statusClass={styles.pillWait}
          />
          <BookingRow
            initials="TA"
            tone={styles.toneViolet}
            name="Tola A."
            service="Silk bonnet"
            when="Sun 15 Nov · Ikeja"
            amount="₦8,500"
            status="To deliver"
            statusClass={styles.pillDeliver}
          />
          <BookingRow
            initials="HB"
            tone={styles.toneGreen}
            name="Halima B."
            service="Setting spray"
            when="Mon 16 Nov · pickup"
            amount="₦6,000"
            status="Paid"
            statusClass={styles.pillPaid}
          />
          <BookingRow
            initials="ZM"
            tone={styles.toneRose}
            name="Zainab M."
            service="Brush set"
            when="Tue 17 Nov · Lekki"
            amount="₦15,500"
            status="To pack"
            statusClass={styles.pillWait}
          />
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Recent payments</h2>
            <span className={styles.quiet}>Access Bank ··2207</span>
          </div>
          <PayRow title="Brush set" meta="Today · ₦15,500 less ₦642 fee" amount="₦14,858" />
          <PayRow title="Lash kit" meta="Thu 12 Nov · ₦21,000 less ₦835 fee" amount="₦20,165" />
          <PayRow title="Silk bonnet" meta="Wed 11 Nov · ₦8,500 less ₦397 fee" amount="₦8,103" />
          <div className={styles.proNote}>
            <p>
              You&apos;re on Free at 3.5% + ₦100. At this month&apos;s sales, Pro would cost you
              less.
            </p>
            <button type="button" onClick={() => onSelect('settings')}>
              See Pro
            </button>
          </div>
        </section>
      </div>

      <div className={styles.homeBottom}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Low stock</h2>
            <button
              type="button"
              className={styles.textLink}
              onClick={() => onSelect('shop-products')}
            >
              View products
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <QuoteRow
            title="Lash kit"
            meta="2 left · 6 sold this week"
            amount="₦21,000"
            status="Low"
            statusClass={styles.pillWait}
          />
          <QuoteRow
            title="Setting spray"
            meta="4 left · 3 sold this week"
            amount="₦6,000"
            status="Low"
            statusClass={styles.pillWait}
          />
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Preorders</h2>
            <button
              type="button"
              className={styles.textLink}
              onClick={() => onSelect('shop-orders')}
            >
              Open orders
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <QuoteRow
            title="Silk bonnet"
            meta="4 buyers · ships 20 Nov"
            amount="₦34,000"
            status="Preorder"
            statusClass={styles.pillDeliver}
          />
          <QuoteRow
            title="Custom case"
            meta="1 buyer · ships 28 Nov"
            amount="₦12,000"
            status="Preorder"
            statusClass={styles.pillDeliver}
          />
        </section>
      </div>
    </>
  );
}

const ISSUE_WEEK = [
  { day: 'Sat', date: '14', count: '1', current: true },
  { day: 'Sun', date: '15', count: '—', current: false },
  { day: 'Mon', date: '16', count: '—', current: false },
  { day: 'Tue', date: '17', count: '—', current: false },
  { day: 'Wed', date: '18', count: '—', current: false },
  { day: 'Thu', date: '19', count: '—', current: false },
  { day: 'Fri', date: '20', count: '—', current: false },
];

function NewsletterFill({ onSelect }: { onSelect: (id: SectionId) => void }) {
  return (
    <>
      <div className={styles.homeTop}>
        <section className={styles.nextCard}>
          <div className={styles.nextHead}>
            <span>Next up · tomorrow</span>
            <span className={styles.paidChip}>
              <Check strokeWidth={2} />
              Scheduled
            </span>
          </div>
          <h2>The Sunday letter</h2>
          <p>Sat 14 Nov · 9:00 AM · 1,240 readers</p>
          <div className={styles.days}>
            {ISSUE_WEEK.map((day) => (
              <div key={day.date} className={`${styles.day} ${day.current ? styles.dayOn : ''}`}>
                <span>{day.day}</span>
                <strong>{day.date}</strong>
                <span>{day.count}</span>
              </div>
            ))}
          </div>
          <div className={styles.nextActions}>
            <button
              type="button"
              className={styles.nextPrimary}
              onClick={() => onSelect('newsletter')}
            >
              Open draft
            </button>
            <button
              type="button"
              className={styles.nextGhost}
              onClick={() => onSelect('newsletter')}
            >
              View readers
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Notifications</h2>
            <span className={styles.count}>3</span>
          </div>
          <Need
            title="Finish tomorrow's draft"
            meta="The Sunday letter · scheduled 9:00 AM"
            onOpen={() => onSelect('newsletter')}
          />
          <Need
            title="12 replies waiting"
            meta="From last Sunday's letter"
            onOpen={() => onSelect('newsletter')}
          />
          <Need
            title="4 people to welcome"
            meta="Joined since Thursday"
            onOpen={() => onSelect('newsletter')}
          />
        </section>
      </div>

      <div className={styles.homeMid}>
        <section className={styles.earn}>
          <div>
            <p className={styles.eyebrow}>Earnings this month</p>
            <p className={styles.big}>₦186,000</p>
            <p className={styles.quiet}>After fees, from 86 paid readers</p>
            <button type="button" className={styles.textLink} onClick={() => onSelect('earnings')}>
              Open earnings
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <div>
            <div className={styles.chartHead}>
              <span>Earnings by week</span>
              <strong>₦42,000 so far this week</strong>
            </div>
            <div className={styles.chart}>
              {BARS.map((bar, index) => (
                <div key={bar.label} className={styles.barCol}>
                  <span
                    className={`${styles.barFill} ${index === BARS.length - 1 ? styles.barNow : ''}`}
                    style={{ height: `${bar.height}%` }}
                  />
                  <span className={styles.barLabel}>{bar.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className={styles.miniStack}>
          <Mini label="Paid readers" meta="On the monthly letter" value="86" />
          <Mini label="Open rate" meta="Last issue · Sunday 7 Nov" value="48%" />
          <Mini label="New this week" meta="Joined since Thursday" value="4" />
        </div>
      </div>

      <div className={styles.homeSplit}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Issues</h2>
            <button
              type="button"
              className={styles.textLink}
              onClick={() => onSelect('newsletter')}
            >
              View all
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <BookingRow
            initials="SL"
            tone={styles.toneViolet}
            name="The Sunday letter"
            service="Tomorrow's issue"
            when="Sat 14 Nov · 9:00 AM"
            amount="Draft"
            status="Scheduled"
            statusClass={styles.pillDeliver}
          />
          <BookingRow
            initials="OR"
            tone={styles.toneOrange}
            name="October roundup"
            service="Sent to 1,236 readers"
            when="Sat 7 Nov · 9:00 AM"
            amount="48% opened"
            status="Sent"
            statusClass={styles.pillPaid}
          />
          <BookingRow
            initials="SN"
            tone={styles.toneBlue}
            name="Studio notes"
            service="Sent to 1,210 readers"
            when="Sat 31 Oct · 9:00 AM"
            amount="51% opened"
            status="Sent"
            statusClass={styles.pillPaid}
          />
          <BookingRow
            initials="AS"
            tone={styles.toneGreen}
            name="A short list"
            service="Sent to 1,188 readers"
            when="Sat 24 Oct · 9:00 AM"
            amount="46% opened"
            status="Sent"
            statusClass={styles.pillPaid}
          />
          <BookingRow
            initials="WK"
            tone={styles.toneRose}
            name="What I kept"
            service="Sent to 1,164 readers"
            when="Sat 17 Oct · 9:00 AM"
            amount="44% opened"
            status="Sent"
            statusClass={styles.pillPaid}
          />
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Recent payments</h2>
            <span className={styles.quiet}>Access Bank ··2207</span>
          </div>
          <PayRow title="Monthly letter" meta="Today · ₦2,000 less ₦170 fee" amount="₦1,830" />
          <PayRow title="Monthly letter" meta="Thu 12 Nov · ₦2,000 less ₦170 fee" amount="₦1,830" />
          <PayRow title="Monthly letter" meta="Wed 11 Nov · ₦2,000 less ₦170 fee" amount="₦1,830" />
          <div className={styles.proNote}>
            <p>
              You&apos;re on Free at 3.5% + ₦100. At this month&apos;s sales, Pro would cost you
              less.
            </p>
            <button type="button" onClick={() => onSelect('settings')}>
              See Pro
            </button>
          </div>
        </section>
      </div>

      <div className={styles.homeBottom}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Replies</h2>
            <button
              type="button"
              className={styles.textLink}
              onClick={() => onSelect('newsletter')}
            >
              Open replies
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <QuoteRow
            title="Chiamaka E."
            meta="On the bridal essay"
            amount="Yesterday"
            status="Reply"
            statusClass={styles.pillWait}
          />
          <QuoteRow
            title="Tolu A."
            meta="Asking for the product list"
            amount="Thu 12 Nov"
            status="Reply"
            statusClass={styles.pillWait}
          />
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>New readers</h2>
            <button
              type="button"
              className={styles.textLink}
              onClick={() => onSelect('newsletter')}
            >
              View readers
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
          <QuoteRow
            title="Amaka U."
            meta="Joined Thursday"
            amount="Paid"
            status="New"
            statusClass={styles.pillPaid}
          />
          <QuoteRow
            title="Kemi O."
            meta="Joined Wednesday"
            amount="Free"
            status="New"
            statusClass={styles.pillDeliver}
          />
        </section>
      </div>
    </>
  );
}

function Need({
  title,
  meta,
  onOpen,
}: {
  title: string;
  meta: string;
  onOpen: () => void;
}) {
  return (
    <div className={styles.need}>
      <span className={styles.needBell} aria-hidden="true">
        <Bell strokeWidth={1.75} />
      </span>
      <div className={styles.needMain}>
        <div className={styles.needTop}>
          <strong>{title}</strong>
          <button type="button" onClick={onOpen}>
            View
            <ArrowRight strokeWidth={1.75} />
          </button>
        </div>
        <span>{meta}</span>
      </div>
    </div>
  );
}

function Mini({ label, meta, value }: { label: string; meta: string; value: string }) {
  return (
    <article className={styles.mini}>
      <div>
        <strong>{label}</strong>
        <span>{meta}</span>
      </div>
      <b>{value}</b>
    </article>
  );
}

function BookingRow({
  initials,
  tone,
  name,
  service,
  when,
  amount,
  status,
  statusClass,
}: {
  initials: string;
  tone: string;
  name: string;
  service: string;
  when: string;
  amount: string;
  status: string;
  statusClass: string;
}) {
  return (
    <div className={styles.line}>
      <div className={styles.who}>
        <span className={`${styles.avatar} ${tone}`}>{initials}</span>
        <div>
          <strong>{name}</strong>
          <span>{service}</span>
        </div>
      </div>
      <span className={styles.when}>{when}</span>
      <strong className={styles.amount}>{amount}</strong>
      <span className={`${styles.pill} ${statusClass}`}>{status}</span>
    </div>
  );
}

function PayRow({ title, meta, amount }: { title: string; meta: string; amount: string }) {
  return (
    <div className={styles.pay}>
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <strong>{amount}</strong>
    </div>
  );
}

function QuoteRow({
  title,
  meta,
  amount,
  status,
  statusClass,
}: {
  title: string;
  meta: string;
  amount: string;
  status: string;
  statusClass: string;
}) {
  return (
    <div className={styles.quote}>
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <strong>{amount}</strong>
      <span className={`${styles.pill} ${statusClass}`}>{status}</span>
    </div>
  );
}

type BookingTab = 'upcoming' | 'balance' | 'disputed' | 'completed';
type BookingView = 'bookings' | 'services' | 'availability';

const SCHEDULE = [
  {
    group: 'Tomorrow',
    day: 'Sat',
    date: '14',
    name: 'Chiamaka E.',
    detail: '9:00 AM · Bridal makeup · Lekki',
    amount: '₦80,000',
    due: '',
    status: 'Paid in full',
    pill: 'pillPaid',
    filters: ['upcoming'],
  },
  {
    group: 'This week',
    day: 'Sun',
    date: '15',
    name: 'Tolu A.',
    detail: '2:00 PM · Soft glam · Ikeja',
    amount: '₦30,000',
    due: '',
    status: 'Paid in full',
    pill: 'pillPaid',
    filters: ['upcoming'],
  },
  {
    group: 'This week',
    day: 'Wed',
    date: '18',
    name: 'Halima B.',
    detail: '11:00 AM · Bridal trial · at your studio',
    amount: '₦25,000',
    due: '',
    status: 'Paid in full',
    pill: 'pillPaid',
    filters: ['upcoming'],
  },
  {
    group: 'Later in November',
    day: 'Sat',
    date: '21',
    name: 'Zainab M.',
    detail: '8:00 AM · Bridal makeup · Surulere',
    amount: '₦40,000 of ₦80,000',
    due: '₦40,000 due tomorrow',
    status: 'Deposit paid',
    pill: 'pillWait',
    filters: ['upcoming', 'balance'],
  },
  {
    group: 'Later in November',
    day: 'Sun',
    date: '22',
    name: 'Ifeoma N.',
    detail: '4:00 PM · Soft glam · Yaba',
    amount: '₦30,000',
    due: '',
    status: 'Paid in full',
    pill: 'pillPaid',
    filters: ['upcoming'],
  },
  {
    group: 'Later in November',
    day: 'Sat',
    date: '28',
    name: 'Bisi K.',
    detail: '9:00 AM · Bridal makeup · Ikoyi',
    amount: '₦40,000 of ₦80,000',
    due: '₦40,000 due Sat 21 Nov',
    status: 'Deposit paid',
    pill: 'pillWait',
    filters: ['upcoming', 'balance'],
  },
] as const;

const COMPLETED_ROWS = [
  {
    group: 'Completed',
    day: 'Sun',
    date: '2',
    name: 'Amaka U.',
    detail: '1:00 PM · Soft glam · Lekki',
    amount: '₦45,000',
    due: '',
    status: 'Completed',
    pill: 'pillPaid',
  },
  {
    group: 'Completed',
    day: 'Tue',
    date: '28',
    name: 'Kemi O.',
    detail: '11:00 AM · Bridal trial',
    amount: '₦25,000',
    due: '',
    status: 'Completed',
    pill: 'pillPaid',
  },
  {
    group: 'Completed',
    day: 'Fri',
    date: '24',
    name: 'Ada M.',
    detail: '3:00 PM · Makeup · Yaba',
    amount: '₦20,000',
    due: '',
    status: 'Completed',
    pill: 'pillPaid',
  },
  {
    group: 'Completed',
    day: 'Sat',
    date: '18',
    name: 'Sade L.',
    detail: '9:00 AM · Bridal makeup · Ikoyi',
    amount: '₦80,000',
    due: '',
    status: 'Completed',
    pill: 'pillPaid',
  },
  {
    group: 'Completed',
    day: 'Wed',
    date: '15',
    name: 'Tobi R.',
    detail: '2:00 PM · Soft glam · Ikeja',
    amount: '₦30,000',
    due: '',
    status: 'Completed',
    pill: 'pillPaid',
  },
] as const;

const DISPUTED_ROWS = [
  {
    group: 'Disputed',
    day: 'Sat',
    date: '7',
    name: 'Funke O.',
    detail: 'Soft glam · ₦30,000 paid',
    amount: '₦30,000',
    due: 'Refund requested',
    status: 'Disputed',
    pill: 'pillAlert',
  },
] as const;

const SERVICES = [
  { name: 'Bridal makeup', meta: 'Lekki · 3 hours', price: '₦80,000' },
  { name: 'Soft glam', meta: 'Studio or home · 90 minutes', price: '₦30,000' },
  { name: 'Bridal trial', meta: 'Studio · 75 minutes', price: '₦25,000' },
];

const HOURS = [
  { day: 'Weekdays', hours: '9:00am – 6:00pm', state: 'Open' },
  { day: 'Saturday', hours: '10:00am – 4:00pm', state: 'Open' },
  { day: 'Sunday', hours: 'Not bookable', state: 'Closed' },
];

function DemoBookingsPage({ initialView = 'bookings' }: { initialView?: BookingView }) {
  const [view, setView] = useState<BookingView>(initialView);
  const [tab, setTab] = useState<BookingTab>('upcoming');
  const [query, setQuery] = useState('');
  const source =
    tab === 'completed' ? COMPLETED_ROWS : tab === 'disputed' ? DISPUTED_ROWS : SCHEDULE;
  const rows = source.filter((row) => {
    const onTab = tab === 'completed' || tab === 'disputed' || row.filters.includes(tab);
    const q = query.trim().toLowerCase();
    const matches = !q || `${row.name} ${row.detail}`.toLowerCase().includes(q);
    return onTab && matches;
  });
  const groups = rows.reduce<string[]>((list, row) => {
    if (!list.includes(row.group)) list.push(row.group);
    return list;
  }, []);

  return (
    <div className={styles.home}>
      <header className={styles.pageHead}>
        <div>
          <h1>Bookings</h1>
          <p>Six upcoming, one tomorrow. ₦80,000 still to collect.</p>
        </div>
        <div className={styles.modeSwitch} role="tablist" aria-label="Bookings views">
          {(
            [
              ['bookings', 'Bookings'],
              ['services', 'Services'],
              ['availability', 'Availability'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {view === 'bookings' ? (
        <div className={styles.bookLayout}>
          <section className={styles.card}>
            <div className={styles.bookTools}>
              <div className={styles.modeSwitch} role="tablist" aria-label="Booking status">
                {(
                  [
                    ['upcoming', 'Upcoming', '6', false],
                    ['balance', 'Balance due', '2', false],
                    ['disputed', 'Disputed', '1', true],
                    ['completed', 'Completed', '5', false],
                  ] as const
                ).map(([id, label, count, alert]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                  >
                    {label}
                    <span className={`${styles.tabCount} ${alert ? styles.tabCountAlert : ''}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
              <input
                className={styles.bookSearch}
                value={query}
                placeholder="Client or service"
                aria-label="Search clients or services"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {groups.map((group) => (
              <div key={group}>
                <p className={styles.bookGroup}>{group}</p>
                {rows
                  .filter((row) => row.group === group)
                  .map((row) => (
                    <ScheduleRow
                      key={`${row.name}-${row.date}`}
                      day={row.day}
                      date={row.date}
                      name={row.name}
                      detail={row.detail}
                      amount={row.amount}
                      due={row.due}
                      status={row.status}
                      statusClass={styles[row.pill]}
                    />
                  ))}
              </div>
            ))}
            {rows.length === 0 ? (
              <p className={styles.quiet}>No bookings match that search.</p>
            ) : null}
          </section>

          <aside className={styles.bookSide}>
            <section className={styles.collectCard}>
              <p className={styles.eyebrow}>Paid on upcoming bookings</p>
              <p className={styles.big}>₦245,000</p>
              <p className={styles.quiet}>of ₦325,000 booked</p>
              <div className={styles.track} aria-hidden="true">
                <span style={{ width: '75%' }} />
              </div>
              <div className={styles.collectRow}>
                <div>
                  <strong>Still to collect</strong>
                  <span>
                    Zainab M. tomorrow, Bisi K. on Sat 21 Nov. Each gets an email reminder two days
                    before.
                  </span>
                </div>
                <b>₦80,000</b>
              </div>
            </section>

            <section className={styles.card}>
              <p className={styles.disputeLabel}>
                <span className={styles.pillAlert}>1</span>1 disputed booking
              </p>
              <h2 className={styles.sideTitle}>Funke O. · Soft glam</h2>
              <p className={styles.quiet}>Sat 7 Nov · ₦30,000 paid</p>
              <p className={styles.sideCopy}>
                She raised it on Mon 9 Nov, two days after the appointment, and asked for a refund.
              </p>
              <button
                type="button"
                className={styles.darkButton}
                onClick={() => setTab('disputed')}
              >
                Review dispute
              </button>
            </section>

            <section className={styles.card}>
              <h2 className={styles.sideTitle}>Open days this week</h2>
              <p className={styles.quiet}>Clients can still book these from your link.</p>
              <div className={styles.openDays}>
                {['Mon 16', 'Tue 17', 'Thu 19', 'Fri 20'].map((day) => (
                  <span key={day} className={`${styles.pill} ${styles.pillWait}`}>
                    {day}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className={styles.textLink}
                onClick={() => setView('availability')}
              >
                Edit availability
                <ArrowRight strokeWidth={1.75} />
              </button>
            </section>
          </aside>
        </div>
      ) : null}

      {view === 'services' ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Services</h2>
            <span className={styles.quiet}>3 on your price list</span>
          </div>
          {SERVICES.map((service) => (
            <QuoteRow
              key={service.name}
              title={service.name}
              meta={service.meta}
              amount={service.price}
              status="Listed"
              statusClass={styles.pillPaid}
            />
          ))}
        </section>
      ) : null}

      {view === 'availability' ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Availability</h2>
            <span className={styles.quiet}>Hours clients can book</span>
          </div>
          {HOURS.map((slot) => (
            <QuoteRow
              key={slot.day}
              title={slot.day}
              meta="Clients can book"
              amount={slot.hours}
              status={slot.state}
              statusClass={slot.state === 'Open' ? styles.pillPaid : styles.pillWait}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function ScheduleRow({
  day,
  date,
  name,
  detail,
  amount,
  due,
  status,
  statusClass,
}: {
  day: string;
  date: string;
  name: string;
  detail: ReactNode;
  amount: string;
  due: string;
  status: string;
  statusClass: string;
}) {
  return (
    <div className={styles.sched}>
      <div className={styles.dateBox}>
        <span>{day}</span>
        <strong>{date}</strong>
      </div>
      <div className={styles.schedWho}>
        <strong>{name}</strong>
        <span>{detail}</span>
      </div>
      <div className={styles.schedAmount}>
        <strong>{amount}</strong>
        {due ? <span>{due}</span> : null}
      </div>
      <span className={`${styles.pill} ${statusClass}`}>{status}</span>
      <ArrowRight className={styles.schedArrow} strokeWidth={1.75} aria-hidden="true" />
    </div>
  );
}

function OtherDemoPage({
  section,
  onSelect,
}: {
  section: Exclude<SectionId, 'overview' | 'dashboard'>;
  onSelect: (id: SectionId) => void;
}) {
  if (section === 'bookings' || section === 'availability') {
    return (
      <DemoBookingsPage initialView={section === 'availability' ? 'availability' : 'bookings'} />
    );
  }
  if (section === 'shop' || section.startsWith('shop-')) {
    const tab =
      section === 'shop-orders' ? 'orders' : section === 'shop-coupons' ? 'coupons' : 'products';
    return <DemoShopPage key={section} initial={tab} onSelect={onSelect} />;
  }
  if (section === 'newsletter') return <DemoNewsletterPage />;
  if (section === 'invoices') return <DemoInvoicesPage onSelect={onSelect} />;
  if (section === 'earnings') return <DemoEarningsPage onSelect={onSelect} />;
  if (section === 'payouts') return <DemoPayoutsPage onSelect={onSelect} />;
  if (section === 'profile') return <DemoProfilePage />;
  return <DemoAccountPage />;
}

function PageIntro({
  title,
  subtitle,
  tabs,
  tab,
  onTab,
}: {
  title: string;
  subtitle: string;
  tabs?: { id: string; label: string }[];
  tab?: string;
  onTab?: (id: string) => void;
}) {
  return (
    <header className={styles.pageHead}>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {tabs && onTab ? (
        <div className={styles.modeSwitch} role="tablist" aria-label={title}>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => onTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}

type PillKey = 'pillPaid' | 'pillWait' | 'pillDeliver' | 'pillAlert';

function pillOf(name: PillKey) {
  return styles[name];
}

type ProductRow = {
  id: string;
  group: string;
  initials: string;
  name: string;
  meta: string;
  stock: string;
  note: string;
  status: string;
  pill: PillKey;
  bucket: 'listed' | 'preorder' | 'draft';
};

const SHOP_PRODUCTS: ProductRow[] = [
  {
    id: 'lash',
    group: 'On your page',
    initials: 'LK',
    name: 'Lash kit',
    meta: '₦21,000 · 3 sold this month',
    stock: '2 left',
    note: 'Update stock',
    status: 'Low stock',
    pill: 'pillWait',
    bucket: 'listed',
  },
  {
    id: 'spray',
    group: 'On your page',
    initials: 'SS',
    name: 'Setting spray',
    meta: '₦6,000 · 8 sold this month',
    stock: '4 left',
    note: 'Update stock',
    status: 'Low stock',
    pill: 'pillWait',
    bucket: 'listed',
  },
  {
    id: 'brush',
    group: 'On your page',
    initials: 'BS',
    name: 'Brush set',
    meta: '₦15,500 · 3 sold this month',
    stock: '12 in stock',
    note: 'Plenty for now',
    status: 'Listed',
    pill: 'pillPaid',
    bucket: 'listed',
  },
  {
    id: 'bonnet',
    group: 'Preorder',
    initials: 'SB',
    name: 'Silk bonnet',
    meta: '₦8,500 · paid upfront',
    stock: '3 preordered',
    note: 'Ships Fri 20 Nov',
    status: 'Preorder',
    pill: 'pillDeliver',
    bucket: 'preorder',
  },
  {
    id: 'case',
    group: 'Preorder',
    initials: 'CC',
    name: 'Custom case',
    meta: '₦12,000 · paid upfront',
    stock: '2 preordered',
    note: 'Ships Sat 28 Nov',
    status: 'Preorder',
    pill: 'pillDeliver',
    bucket: 'preorder',
  },
  {
    id: 'gloss',
    group: 'Not on your page',
    initials: 'LG',
    name: 'Lip gloss trio',
    meta: '₦9,000 · no photo yet',
    stock: '20 in stock',
    note: 'Add a photo to list it',
    status: 'Draft',
    pill: 'pillWait',
    bucket: 'draft',
  },
];

const DELIVERIES = [
  {
    id: 'amaka',
    initials: 'BS',
    name: 'Brush set',
    who: 'Amaka U. · Wuse 2, Abuja',
    when: 'Paid Thu 5 Nov',
    wait: 'waiting 8 days',
    late: true,
  },
  {
    id: 'dami',
    initials: 'SS',
    name: 'Setting spray × 2',
    who: 'Dami A. · Bodija, Ibadan',
    when: 'Paid Mon 9 Nov',
    wait: 'waiting 4 days',
    late: true,
  },
  {
    id: 'kemi',
    initials: 'LK',
    name: 'Lash kit',
    who: 'Kemi O. · Lekki, Lagos',
    when: 'Paid Thu 12 Nov',
    wait: 'yesterday',
    late: false,
  },
];

function DemoShopPage({
  initial,
  onSelect,
}: {
  initial: 'products' | 'orders' | 'coupons';
  onSelect: (id: SectionId) => void;
}) {
  const [view, setView] = useState(initial);
  const [bucket, setBucket] = useState<'all' | 'listed' | 'preorder' | 'draft'>('all');
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<ProductRow[]>([]);
  const products = [...SHOP_PRODUCTS, ...added];
  const shown = products.filter((item) => {
    const onBucket = bucket === 'all' || item.bucket === bucket;
    const q = query.trim().toLowerCase();
    return onBucket && (!q || `${item.name} ${item.meta}`.toLowerCase().includes(q));
  });
  const groups = ['On your page', 'Preorder', 'Not on your page'].filter((group) =>
    shown.some((item) => item.group === group)
  );
  const counts = {
    listed: products.filter((item) => item.bucket === 'listed').length,
    preorder: products.filter((item) => item.bucket === 'preorder').length,
    draft: products.filter((item) => item.bucket === 'draft').length,
  };

  function addProduct() {
    setAdded((list) => [
      ...list,
      {
        id: `draft-${list.length + 1}`,
        group: 'Not on your page',
        initials: 'NP',
        name: 'New product',
        meta: '₦0 · no photo yet',
        stock: '0 in stock',
        note: 'Add a photo to list it',
        status: 'Draft',
        pill: 'pillWait',
        bucket: 'draft',
      },
    ]);
    setView('products');
    setBucket('draft');
    setNote('A draft product was added to this sample.');
  }

  return (
    <div className={styles.home}>
      <header className={styles.pageHead}>
        <div>
          <h1>Shop</h1>
          <p>Three orders to deliver, and two products running low.</p>
        </div>
        <div className={styles.headTools}>
          <div className={styles.modeSwitch} role="tablist" aria-label="Shop">
            {(
              [
                ['products', 'Products', String(products.length), false],
                ['orders', 'Orders', '3', false],
                ['coupons', 'Coupons', '', true],
              ] as const
            ).map(([id, label, count, pro]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                onClick={() => setView(id)}
              >
                {label}
                {count ? <span className={styles.tabCount}>{count}</span> : null}
                {pro ? <span className={styles.proMark}>PRO</span> : null}
              </button>
            ))}
          </div>
          <button type="button" className={styles.solid} onClick={addProduct}>
            Add product
          </button>
        </div>
      </header>
      {note ? (
        <p className={styles.notice} role="status">
          {note}
        </p>
      ) : null}

      <div className={styles.bookLayout}>
        {view === 'products' ? (
          <section className={styles.card}>
            <div className={styles.bookTools}>
              <div className={styles.modeSwitch} role="tablist" aria-label="Product status">
                {(
                  [
                    ['all', 'All', String(products.length)],
                    ['listed', 'Listed', String(counts.listed)],
                    ['preorder', 'Preorder', String(counts.preorder)],
                    ['draft', 'Draft', String(counts.draft)],
                  ] as const
                ).map(([id, label, count]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={bucket === id}
                    onClick={() => setBucket(id)}
                  >
                    {label}
                    <span className={styles.tabCount}>{count}</span>
                  </button>
                ))}
              </div>
              <input
                className={styles.bookSearch}
                value={query}
                placeholder="Filter products"
                aria-label="Filter products"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {groups.map((group) => (
              <div key={group}>
                <p className={styles.bookGroup}>{group}</p>
                {shown
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <div key={item.id} className={styles.goods}>
                      <span className={styles.markBox}>{item.initials}</span>
                      <div className={styles.goodsText}>
                        <strong>{item.name}</strong>
                        <span>{item.meta}</span>
                      </div>
                      <div className={styles.stock}>
                        <strong>{item.stock}</strong>
                        <span>{item.note}</span>
                      </div>
                      <span className={`${styles.pill} ${pillOf(item.pill)}`}>{item.status}</span>
                      <ArrowRight
                        className={styles.schedArrow}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </div>
                  ))}
              </div>
            ))}
            {shown.length === 0 ? (
              <p className={styles.quiet}>No products match that filter.</p>
            ) : null}
            <div className={styles.cardFoot}>
              <span>{Math.min(products.length, 10)} of the 10 products you can list on Free</span>
              <button
                type="button"
                className={`${styles.textLink} ${styles.inlineLink}`}
                onClick={() => setNote('Delivery settings are not connected in this demo.')}
              >
                Delivery settings
                <ArrowRight strokeWidth={1.75} />
              </button>
            </div>
          </section>
        ) : null}

        {view === 'orders' ? (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Orders</h2>
              <span className={styles.asideMeta}>3 to deliver</span>
            </div>
            {DELIVERIES.map((order) => (
              <div key={order.id} className={styles.goods}>
                <span className={styles.markBox}>{order.initials}</span>
                <div className={styles.goodsText}>
                  <strong>{order.name}</strong>
                  <span>{order.who}</span>
                </div>
                <div className={styles.stock}>
                  <strong>{sent[order.id] ? 'Sent' : order.wait}</strong>
                  <span>{order.when}</span>
                </div>
                <span
                  className={`${styles.pill} ${sent[order.id] ? styles.pillPaid : styles.pillDeliver}`}
                >
                  {sent[order.id] ? 'Sent' : 'To deliver'}
                </span>
                <ArrowRight className={styles.schedArrow} strokeWidth={1.75} aria-hidden="true" />
              </div>
            ))}
          </section>
        ) : null}

        {view === 'coupons' ? (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Coupons</h2>
              <span className={styles.asideMeta}>Pro</span>
            </div>
            <div className={styles.goods}>
              <span className={styles.markBox}>W1</span>
              <div className={styles.goodsText}>
                <strong>WELCOME10</strong>
                <span>10% off · 4 uses</span>
              </div>
              <div className={styles.stock}>
                <strong>10%</strong>
                <span>Shared on your page</span>
              </div>
              <span className={`${styles.pill} ${styles.pillPaid}`}>Active</span>
              <ArrowRight className={styles.schedArrow} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className={styles.goods}>
              <span className={styles.markBox}>LN</span>
              <div className={styles.goodsText}>
                <strong>LAUNCH</strong>
                <span>₦2,000 off · not shared</span>
              </div>
              <div className={styles.stock}>
                <strong>₦2,000</strong>
                <span>Not on your page yet</span>
              </div>
              <span className={`${styles.pill} ${styles.pillWait}`}>Draft</span>
              <ArrowRight className={styles.schedArrow} strokeWidth={1.75} aria-hidden="true" />
            </div>
          </section>
        ) : null}

        <aside className={styles.bookSide}>
          {view !== 'coupons' ? (
            <section className={styles.ink}>
              <div className={styles.cardHead}>
                <h2>To deliver</h2>
                <button type="button" className={styles.inkLink} onClick={() => setView('orders')}>
                  All orders
                  <ArrowRight strokeWidth={1.75} />
                </button>
              </div>
              {DELIVERIES.map((order) => (
                <div key={order.id} className={styles.deliverRow}>
                  <div>
                    <strong>{order.name}</strong>
                    <span>{order.who}</span>
                    <span>
                      {order.when}
                      {' · '}
                      {sent[order.id] ? (
                        'sent'
                      ) : (
                        <em className={order.late ? styles.waitLate : undefined}>{order.wait}</em>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.onInk}
                    disabled={Boolean(sent[order.id])}
                    onClick={() => setSent((current) => ({ ...current, [order.id]: true }))}
                  >
                    {sent[order.id] ? 'Sent' : 'Mark as sent'}
                  </button>
                </div>
              ))}
            </section>
          ) : (
            <section className={styles.card}>
              <h2 className={styles.sideTitle}>How a coupon works</h2>
              <ol className={styles.steps}>
                <li>
                  <span className={styles.stepNo}>1</span>
                  <div>
                    <strong>Set the discount</strong>
                    <span>A percent off, or a fixed amount in naira.</span>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNo}>2</span>
                  <div>
                    <strong>Share the code</strong>
                    <span>Clients enter it at checkout. No account needed.</span>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNo}>3</span>
                  <div>
                    <strong>You still get paid</strong>
                    <span>The discount comes off the sale. Fees come off what is left.</span>
                  </div>
                </li>
              </ol>
            </section>
          )}

          {view === 'products' ? (
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h2>Preorders to make</h2>
                <span className={styles.asideMeta}>5 paid</span>
              </div>
              <div className={styles.splitRow}>
                <div>
                  <strong>Silk bonnet × 3</strong>
                  <span>Ships Fri 20 Nov</span>
                </div>
                <b>7 days</b>
              </div>
              <div className={styles.splitRow}>
                <div>
                  <strong>Custom case × 2</strong>
                  <span>Ships Sat 28 Nov</span>
                </div>
                <b>15 days</b>
              </div>
            </section>
          ) : null}

          <section className={styles.collectCard}>
            <p className={styles.eyebrow}>Shop earnings this month</p>
            <p className={styles.big}>₦72,945</p>
            <p className={styles.quiet}>After fees · 9 orders · 14 products sold</p>
            <button type="button" className={styles.textLink} onClick={() => onSelect('earnings')}>
              Open earnings
              <ArrowRight strokeWidth={1.75} />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DemoNewsletterPage() {
  const [view, setView] = useState<'issues' | 'replies' | 'readers'>('issues');

  return (
    <div className={styles.home}>
      <PageIntro
        title="Newsletters"
        subtitle="Issues, replies, and readers."
        tab={view}
        onTab={(id) => setView(id as typeof view)}
        tabs={[
          { id: 'issues', label: 'Issues' },
          { id: 'replies', label: 'Replies' },
          { id: 'readers', label: 'Readers' },
        ]}
      />
      <div className={styles.summary}>
        <Summary label="Paid readers" value="86" meta="Monthly letter" />
        <Summary label="Open rate" value="48%" meta="Last issue" />
        <Summary label="Replies" value="12" meta="Waiting" />
        <Summary label="New this week" value="4" meta="Since Thursday" />
      </div>
      {view === 'issues' ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Issues</h2>
          </div>
          <BookingRow
            initials="SL"
            tone={styles.toneViolet}
            name="The Sunday letter"
            service="Tomorrow's issue"
            when="Sat 14 Nov · 9:00 AM"
            amount="Draft"
            status="Scheduled"
            statusClass={styles.pillDeliver}
          />
          <BookingRow
            initials="OR"
            tone={styles.toneOrange}
            name="October roundup"
            service="1,236 readers"
            when="Sat 7 Nov · 9:00 AM"
            amount="48% opened"
            status="Sent"
            statusClass={styles.pillPaid}
          />
          <BookingRow
            initials="SN"
            tone={styles.toneBlue}
            name="Studio notes"
            service="1,210 readers"
            when="Sat 31 Oct · 9:00 AM"
            amount="51% opened"
            status="Sent"
            statusClass={styles.pillPaid}
          />
          <BookingRow
            initials="AS"
            tone={styles.toneGreen}
            name="A short list"
            service="1,188 readers"
            when="Sat 24 Oct · 9:00 AM"
            amount="46% opened"
            status="Sent"
            statusClass={styles.pillPaid}
          />
        </section>
      ) : null}
      {view === 'replies' ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Replies</h2>
          </div>
          <QuoteRow
            title="Chiamaka E."
            meta="On the bridal essay"
            amount="Yesterday"
            status="Reply"
            statusClass={styles.pillWait}
          />
          <QuoteRow
            title="Tolu A."
            meta="Asking for the product list"
            amount="Thu 12 Nov"
            status="Reply"
            statusClass={styles.pillWait}
          />
          <QuoteRow
            title="Halima B."
            meta="Loved the October roundup"
            amount="Wed 11 Nov"
            status="Read"
            statusClass={styles.pillPaid}
          />
        </section>
      ) : null}
      {view === 'readers' ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Readers</h2>
          </div>
          <QuoteRow
            title="Amaka U."
            meta="Joined Thursday"
            amount="Paid"
            status="New"
            statusClass={styles.pillPaid}
          />
          <QuoteRow
            title="Kemi O."
            meta="Joined Wednesday"
            amount="Free"
            status="New"
            statusClass={styles.pillDeliver}
          />
          <QuoteRow
            title="Paid readers"
            meta="Monthly letter"
            amount="86"
            status="Active"
            statusClass={styles.pillPaid}
          />
        </section>
      ) : null}
    </div>
  );
}

type QuoteListRow = {
  id: string;
  day: string;
  date: string;
  name: string;
  detail: string;
  amount: string;
  due: string;
  status: string;
  pill: PillKey;
  bucket: 'unpaid' | 'paid' | 'draft';
};

const QUOTE_ROWS: QuoteListRow[] = [
  {
    id: 'ngozi',
    day: 'Dec',
    date: '12',
    name: 'Wedding party of six',
    detail: 'Ngozi A. · for Sat 12 Dec',
    amount: '₦205,000',
    due: 'Sent Thu 12 Nov',
    status: 'Not paid',
    pill: 'pillWait',
    bucket: 'unpaid',
  },
  {
    id: 'bisi',
    day: 'Nov',
    date: '28',
    name: 'Birthday glam, home visit',
    detail: 'Bisi T. · for Sat 28 Nov',
    amount: '₦30,000',
    due: 'Paid Mon 9 Nov',
    status: 'Paid',
    pill: 'pillPaid',
    bucket: 'paid',
  },
  {
    id: 'kemi',
    day: 'Dec',
    date: '4',
    name: 'Two-day shoot, on location',
    detail: 'Studio Kemi · for Fri 4 Dec',
    amount: '₦150,000',
    due: 'Paid Fri 6 Nov',
    status: 'Paid',
    pill: 'pillPaid',
    bucket: 'paid',
  },
];

function DemoInvoicesPage({ onSelect }: { onSelect: (id: SectionId) => void }) {
  const [view, setView] = useState<'quotes' | 'invoices'>('quotes');
  const [bucket, setBucket] = useState<'all' | 'unpaid' | 'paid' | 'draft'>('all');
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState<QuoteListRow[]>([]);
  const quotes = [...added, ...QUOTE_ROWS];
  const source = view === 'invoices' ? quotes.filter((row) => row.bucket === 'paid') : quotes;
  const rows = source.filter((row) => {
    const onBucket = bucket === 'all' || row.bucket === bucket;
    const q = query.trim().toLowerCase();
    return onBucket && (!q || `${row.name} ${row.detail}`.toLowerCase().includes(q));
  });
  const counts = {
    all: quotes.length,
    unpaid: quotes.filter((row) => row.bucket === 'unpaid').length,
    paid: quotes.filter((row) => row.bucket === 'paid').length,
    draft: quotes.filter((row) => row.bucket === 'draft').length,
  };

  function addQuote() {
    setAdded((list) => [
      {
        id: `draft-${list.length + 1}`,
        day: 'Nov',
        date: '16',
        name: 'New quote',
        detail: 'Draft client · not sent',
        amount: '₦0',
        due: 'Not sent',
        status: 'Draft',
        pill: 'pillWait',
        bucket: 'draft',
      },
      ...list,
    ]);
    setView('quotes');
    setBucket('draft');
    setNote('A draft quote was added to this sample.');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText('https://foleio.com/quote/ngz-417k21');
      setCopied(true);
      setNote('Quote link copied.');
    } catch {
      setCopied(false);
      setNote('Quote link: foleio.com/quote/ngz-417k21');
    }
  }

  return (
    <div className={styles.home}>
      <header className={styles.pageHead}>
        <div>
          <h1>Quotes and invoices</h1>
          <p>
            {view === 'quotes'
              ? 'One quote is waiting on Ngozi A. Two were paid this month.'
              : 'Two invoices were paid this month. The wedding quote is still open.'}
          </p>
        </div>
        <div className={styles.headTools}>
          <div className={styles.modeSwitch} role="tablist" aria-label="Quotes and invoices">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'quotes'}
              onClick={() => {
                setView('quotes');
                setBucket('all');
              }}
            >
              Quotes
              <span className={styles.tabCount}>{counts.all}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'invoices'}
              onClick={() => {
                setView('invoices');
                setBucket('all');
              }}
            >
              Invoices
            </button>
          </div>
          <button type="button" className={styles.solid} onClick={addQuote}>
            New quote
          </button>
        </div>
      </header>
      {note ? (
        <p className={styles.notice} role="status">
          {note}
        </p>
      ) : null}

      <div className={styles.bookLayout}>
        <div className={styles.stack}>
          {view === 'quotes' ? (
            <section className={`${styles.card} ${styles.cardLoose}`}>
              <div className={styles.feature}>
                <div>
                  <p className={styles.dotLine}>
                    <i className={styles.dotAmber} />
                    Not paid
                    <span className={styles.asideMeta}>Sent yesterday, Thu 12 Nov</span>
                  </p>
                  <h2 className={styles.featureTitle}>Wedding party of six</h2>
                  <p className={styles.quiet}>Ngozi A. · for Sat 12 Dec · Ikoyi, Lagos</p>
                  <div className={styles.bill}>
                    <span>Bridal makeup</span>
                    <b>₦80,000</b>
                  </div>
                  <div className={styles.bill}>
                    <span>Bridesmaids, five at ₦25,000</span>
                    <b>₦125,000</b>
                  </div>
                  <div className={`${styles.bill} ${styles.billTotal}`}>
                    <span>Total</span>
                    <b>₦205,000</b>
                  </div>
                </div>
                <div className={styles.featurePay}>
                  <p className={styles.eyebrow}>Waiting to be paid</p>
                  <p className={styles.big}>₦205,000</p>
                  <p className={styles.quiet}>
                    You get <strong>₦197,725</strong> after the ₦7,275 fee.
                  </p>
                  <div className={styles.linkRow}>
                    <span className={styles.chip}>foleio.com/quote/ngz-417k21</span>
                    <button type="button" className={styles.ghost} onClick={copyLink}>
                      {copied ? 'Copied' : 'Copy link'}
                    </button>
                  </div>
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={styles.solid}
                      onClick={() => setNote('WhatsApp is not connected in this demo.')}
                    >
                      Send on WhatsApp
                    </button>
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => setNote('Editing quotes is not connected in this demo.')}
                    >
                      Edit quote
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className={`${styles.card} ${styles.cardLoose}`}>
              <div className={styles.feature}>
                <div>
                  <p className={styles.dotLine}>
                    <i className={styles.dotGreen} />
                    Paid
                    <span className={styles.asideMeta}>Paid Fri 6 Nov</span>
                  </p>
                  <h2 className={styles.featureTitle}>Two-day shoot, on location</h2>
                  <p className={styles.quiet}>Studio Kemi · for Fri 4 Dec</p>
                  <div className={styles.bill}>
                    <span>Day one, on location</span>
                    <b>₦90,000</b>
                  </div>
                  <div className={styles.bill}>
                    <span>Day two, on location</span>
                    <b>₦60,000</b>
                  </div>
                  <div className={`${styles.bill} ${styles.billTotal}`}>
                    <span>Total</span>
                    <b>₦150,000</b>
                  </div>
                </div>
                <div className={styles.featurePay}>
                  <p className={styles.eyebrow}>Paid</p>
                  <p className={styles.big}>₦150,000</p>
                  <p className={styles.quiet}>
                    You got <strong>₦144,650</strong> after the ₦5,350 fee.
                  </p>
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => setNote('Receipts are not connected in this demo.')}
                    >
                      View receipt
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className={styles.card}>
            <div className={styles.bookTools}>
              <div className={styles.modeSwitch} role="tablist" aria-label="Quote status">
                {(view === 'quotes'
                  ? ([
                      ['all', 'All', String(counts.all)],
                      ['unpaid', 'Not paid', String(counts.unpaid)],
                      ['paid', 'Paid', String(counts.paid)],
                      ['draft', 'Drafts', String(counts.draft)],
                    ] as const)
                  : ([
                      ['all', 'All', String(counts.paid)],
                      ['paid', 'Paid', String(counts.paid)],
                    ] as const)
                ).map(([id, label, count]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={bucket === id}
                    onClick={() => setBucket(id)}
                  >
                    {label}
                    <span className={styles.tabCount}>{count}</span>
                  </button>
                ))}
              </div>
              <input
                className={styles.bookSearch}
                value={query}
                placeholder="Filter by client"
                aria-label="Filter by client"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {rows.map((row) => (
              <ScheduleRow
                key={row.id}
                day={row.day}
                date={row.date}
                name={row.name}
                detail={row.detail}
                amount={row.amount}
                due={row.due}
                status={row.status}
                statusClass={pillOf(row.pill)}
              />
            ))}
            {rows.length === 0 ? (
              <p className={styles.quiet}>Nothing matches that filter.</p>
            ) : null}
          </section>
        </div>

        <aside className={styles.bookSide}>
          <section className={styles.collectCard}>
            <p className={styles.eyebrow}>
              {view === 'quotes' ? 'Paid on quotes this month' : 'Paid on invoices this month'}
            </p>
            <p className={styles.paidLine}>
              <span className={styles.big}>₦180,000</span>
              <span className={styles.quiet}>of ₦385,000 quoted</span>
            </p>
            <div className={styles.track} aria-hidden="true">
              <span style={{ width: '47%' }} />
            </div>
            <div className={styles.splitRow}>
              <span>You got, after fees</span>
              <b>₦173,500</b>
            </div>
            <div className={styles.splitRow}>
              <span>Still waiting</span>
              <b>₦205,000</b>
            </div>
          </section>

          <section className={styles.card}>
            <p className={styles.dotLine}>
              <i className={styles.dotAmber} />
              Also unpaid, in Bookings
            </p>
            <p className={styles.sideCopy}>
              Zainab M. owes a <strong>₦40,000</strong> balance on her bridal makeup. It is due
              tomorrow.
            </p>
            <button type="button" className={styles.textLink} onClick={() => onSelect('bookings')}>
              See balances due
              <ArrowRight strokeWidth={1.75} />
            </button>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sideTitle}>
              {view === 'quotes' ? 'How a quote works' : 'How an invoice works'}
            </h2>
            <ol className={styles.steps}>
              {(view === 'quotes'
                ? [
                    ['Price the job', 'List what is included and what each part costs.'],
                    ['Send the link', 'Your client opens it on any phone, no account needed.'],
                    ['They pay online', 'The money goes to your bank like any other payment.'],
                  ]
                : [
                    ['A quote gets paid', 'The paid quote is kept here as the invoice.'],
                    ['Fees come out first', 'What you got is the total minus the fee.'],
                    [
                      'Then it pays out',
                      'Paystack sends it to your bank on the next business day.',
                    ],
                  ]
              ).map(([title, body], index) => (
                <li key={title}>
                  <span className={styles.stepNo}>{index + 1}</span>
                  <div>
                    <strong>{title}</strong>
                    <span>{body}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

const EARN_BARS = [
  { label: '21 Sep', height: 28 },
  { label: '28 Sep', height: 46 },
  { label: '5 Oct', height: 34 },
  { label: '12 Oct', height: 52 },
  { label: '19 Oct', height: 48 },
  { label: '26 Oct', height: 38 },
  { label: '2 Nov', height: 86 },
  { label: '9 Nov', height: 74 },
];

const EARN_PAYMENTS: {
  date: string;
  title: string;
  meta: string;
  sale: string;
  fee: string;
  net: string;
  status: string;
  pill: PillKey;
  kind: 'bookings' | 'shop' | 'quotes';
  extra?: boolean;
}[] = [
  {
    date: 'Today',
    title: 'Bridal makeup deposit',
    meta: 'Booking · Amara D. · for Sat 12 Dec',
    sale: '₦40,000',
    fee: '−₦1,500',
    net: '₦38,500',
    status: 'On its way',
    pill: 'pillDeliver',
    kind: 'bookings',
  },
  {
    date: 'Thu 12 Nov',
    title: 'Lash kit',
    meta: 'Shop · Kemi O. · delivery to Lekki',
    sale: '₦21,000',
    fee: '−₦835',
    net: '₦20,165',
    status: 'In your bank',
    pill: 'pillPaid',
    kind: 'shop',
  },
  {
    date: 'Wed 11 Nov',
    title: 'Soft glam',
    meta: 'Booking · Tolu A. · for Sun 15 Nov',
    sale: '₦30,000',
    fee: '−₦1,150',
    net: '₦28,850',
    status: 'In your bank',
    pill: 'pillPaid',
    kind: 'bookings',
  },
  {
    date: 'Mon 9 Nov',
    title: 'Setting spray × 2',
    meta: 'Shop · Dami A. · delivery to Ibadan',
    sale: '₦12,000',
    fee: '−₦520',
    net: '₦11,480',
    status: 'In your bank',
    pill: 'pillPaid',
    kind: 'shop',
  },
  {
    date: 'Sat 7 Nov',
    title: 'Soft glam',
    meta: 'Booking · Funke O. · dispute open',
    sale: '₦30,000',
    fee: '−₦1,150',
    net: '₦28,850',
    status: 'Disputed',
    pill: 'pillAlert',
    kind: 'bookings',
  },
  {
    date: 'Fri 6 Nov',
    title: 'Two-day shoot, on location',
    meta: 'Quote · Studio Kemi · for Fri 4 Dec',
    sale: '₦150,000',
    fee: '−₦5,350',
    net: '₦144,650',
    status: 'In your bank',
    pill: 'pillPaid',
    kind: 'quotes',
  },
  {
    date: 'Thu 6 Nov',
    title: 'Silk bonnet',
    meta: 'Shop · preorder, ships Fri 20 Nov',
    sale: '₦8,500',
    fee: '−₦398',
    net: '₦8,102',
    status: 'In your bank',
    pill: 'pillPaid',
    kind: 'shop',
    extra: true,
  },
  {
    date: 'Wed 5 Nov',
    title: 'Bridal trial',
    meta: 'Booking · Halima B. · at your studio',
    sale: '₦25,000',
    fee: '−₦975',
    net: '₦24,025',
    status: 'In your bank',
    pill: 'pillPaid',
    kind: 'bookings',
    extra: true,
  },
];

const EARN_PERIODS = {
  month: {
    label: 'Earnings this month',
    total: '₦412,300',
    delta: '↑ ₦94,300',
    deltaNote: 'more than all of October',
    foot: '13 days into November. October closed at ₦318,000.',
    week: '₦197,500 so far this week',
    sales: '₦429,016',
    salesMeta: '17 payments this month',
    fees: '₦16,716',
    feesMeta: '3.5% + ₦100 on each payment',
    transit: '₦38,500',
    transitMeta: 'Expected Mon 16 Nov',
  },
  last: {
    label: 'Earnings last month',
    total: '₦318,000',
    delta: 'October',
    deltaNote: 'closed on 31 Oct',
    foot: 'All of October, after fees.',
    week: '₦318,000 for the month',
    sales: '₦330,400',
    salesMeta: '14 payments in October',
    fees: '₦12,400',
    feesMeta: '3.5% + ₦100 on each payment',
    transit: '₦0',
    transitMeta: 'Nothing left on the way',
  },
  year: {
    label: 'Earnings this year',
    total: '₦1,840,000',
    delta: '2026',
    deltaNote: 'January through 13 Nov',
    foot: 'Sample total for the year so far.',
    week: '₦412,300 of that is November',
    sales: '₦1,912,000',
    salesMeta: 'Sample, before fees',
    fees: '₦72,000',
    feesMeta: '3.5% + ₦100 on each payment',
    transit: '₦38,500',
    transitMeta: 'Expected Mon 16 Nov',
  },
} as const;

function DemoEarningsPage({ onSelect }: { onSelect: (id: SectionId) => void }) {
  const [period, setPeriod] = useState<keyof typeof EARN_PERIODS>('month');
  const [kind, setKind] = useState<'all' | 'bookings' | 'shop' | 'quotes'>('all');
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState('');
  const current = EARN_PERIODS[period];
  const payments = EARN_PAYMENTS.filter((row) => {
    const onKind = kind === 'all' || row.kind === kind;
    return onKind && (showAll || !row.extra);
  });

  return (
    <div className={styles.home}>
      <header className={styles.pageHead}>
        <div>
          <h1>Earnings</h1>
          <p>What you have made after fees, and where it came from.</p>
        </div>
        <div className={styles.headTools}>
          <div className={styles.modeSwitch} role="tablist" aria-label="Earnings period">
            {(
              [
                ['month', 'This month'],
                ['last', 'Last month'],
                ['year', 'This year'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={period === id}
                onClick={() => setPeriod(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.modeSwitch} role="tablist" aria-label="Earnings or payouts">
            <button type="button" role="tab" aria-selected="true">
              Earnings
            </button>
            <button
              type="button"
              role="tab"
              aria-selected="false"
              onClick={() => onSelect('payouts')}
            >
              Payouts
            </button>
          </div>
        </div>
      </header>
      {note ? (
        <p className={styles.notice} role="status">
          {note}
        </p>
      ) : null}

      <div className={styles.earnTop}>
        <section className={styles.earn}>
          <div>
            <p className={styles.eyebrow}>{current.label}</p>
            <p className={styles.big}>{current.total}</p>
            <p className={styles.delta}>
              <span className={`${styles.pill} ${styles.pillPaid}`}>{current.delta}</span>
              {current.deltaNote}
            </p>
            <p className={styles.quiet}>{current.foot}</p>
          </div>
          <div>
            <div className={styles.chartHead}>
              <span>Earnings by week</span>
              <strong>{current.week}</strong>
            </div>
            <div className={`${styles.chart} ${styles.chartInk}`}>
              {EARN_BARS.map((bar, index) => (
                <div key={bar.label} className={styles.barCol}>
                  <span
                    className={`${styles.barFill} ${index === EARN_BARS.length - 1 ? styles.barNow : ''}`}
                    style={{ height: `${bar.height}%` }}
                  />
                  <span
                    className={`${styles.barLabel} ${index === EARN_BARS.length - 1 ? styles.barLabelNow : ''}`}
                  >
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.collectCard}>
          <p className={styles.eyebrow}>Where it came from</p>
          {(
            [
              ['Quotes', '₦173,500 · 42%', '42%'],
              ['Bookings', '₦165,855 · 40%', '40%'],
              ['Shop', '₦72,945 · 18%', '18%'],
            ] as const
          ).map(([label, value, width]) => (
            <div key={label} className={styles.mix}>
              <span>{label}</span>
              <span className={styles.mixBar} aria-hidden="true">
                <i style={{ width }} />
              </span>
              <b>{value}</b>
            </div>
          ))}
        </section>
      </div>

      <div className={styles.earnStats}>
        <article className={styles.summaryCard}>
          <span>Sales before fees</span>
          <strong>{current.sales}</strong>
          <em>{current.salesMeta}</em>
        </article>
        <article className={styles.summaryCard}>
          <span>Fees</span>
          <strong>{current.fees}</strong>
          <em>{current.feesMeta}</em>
        </article>
        <article className={styles.summaryCard}>
          <span>On its way to your bank</span>
          <strong>{current.transit}</strong>
          <em>
            {current.transitMeta}
            {' · '}
            <button
              type="button"
              className={`${styles.textLink} ${styles.inlineLink}`}
              onClick={() => onSelect('payouts')}
            >
              See payouts
              <ArrowRight strokeWidth={1.75} />
            </button>
          </em>
        </article>
        <article className={styles.proCard}>
          <p>
            Pro would have cost you <strong>₦4,294</strong> less
          </p>
          <p>₦9,422 in fees plus ₦3,000 for the plan, against ₦16,716 on Free.</p>
          <button
            type="button"
            className={styles.lightButton}
            onClick={() => setNote('Pro is not connected in this demo.')}
          >
            See Pro
          </button>
        </article>
      </div>

      <section className={styles.card}>
        <div className={styles.bookTools}>
          <h2>Payments</h2>
          <div className={styles.modeSwitch} role="tablist" aria-label="Payment source">
            {(
              [
                ['all', 'All', '17'],
                ['bookings', 'Bookings', '6'],
                ['shop', 'Shop', '9'],
                ['quotes', 'Quotes', '2'],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={kind === id}
                onClick={() => setKind(id)}
              >
                {label}
                <span className={styles.tabCount}>{count}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => setNote('CSV download is not connected in this demo.')}
          >
            Download CSV
          </button>
        </div>
        <div className={styles.tableWrap}>
          <div className={`${styles.tr} ${styles.th}`}>
            <span>Date</span>
            <span>Payment</span>
            <span>Sale</span>
            <span>Fee</span>
            <span>You got</span>
            <span>Status</span>
          </div>
          {payments.map((row) => (
            <div key={`${row.date}-${row.title}`} className={styles.tr}>
              <span className={styles.asideMeta}>{row.date}</span>
              <div className={styles.goodsText}>
                <strong>{row.title}</strong>
                <span>{row.meta}</span>
              </div>
              <span className={styles.num}>{row.sale}</span>
              <span className={styles.fee}>{row.fee}</span>
              <span className={styles.num}>{row.net}</span>
              <span className={`${styles.pill} ${pillOf(row.pill)}`}>{row.status}</span>
            </div>
          ))}
        </div>
        {payments.length === 0 ? <p className={styles.quiet}>No payments in that group.</p> : null}
        <div className={styles.cardFoot}>
          <span>Showing {payments.length} of 17 payments this month</span>
          <button
            type="button"
            className={`${styles.textLink} ${styles.inlineLink}`}
            onClick={() => setShowAll((open) => !open)}
          >
            {showAll ? 'Show less' : 'Show all'}
            <ArrowRight strokeWidth={1.75} />
          </button>
        </div>
      </section>
    </div>
  );
}

const PAYOUT_ROWS: {
  group: string;
  day: string;
  date: string;
  name: string;
  detail: string;
  flag?: string;
  amount: string;
  status: string;
  pill: PillKey;
  extra?: boolean;
}[] = [
  {
    group: 'Expected',
    day: 'Mon',
    date: '16',
    name: 'Bridal makeup deposit',
    detail: '1 payment from today',
    amount: '₦38,500',
    status: 'On its way',
    pill: 'pillDeliver',
  },
  {
    group: 'In your bank',
    day: 'Fri',
    date: '13',
    name: 'Lash kit',
    detail: '1 payment from Thu 12 Nov',
    amount: '₦20,165',
    status: 'In your bank',
    pill: 'pillPaid',
  },
  {
    group: 'In your bank',
    day: 'Thu',
    date: '12',
    name: 'Soft glam',
    detail: '1 payment from Wed 11 Nov',
    amount: '₦28,850',
    status: 'In your bank',
    pill: 'pillPaid',
  },
  {
    group: 'In your bank',
    day: 'Wed',
    date: '11',
    name: '2 booking payments',
    detail: 'From Tue 10 Nov',
    amount: '₦41,500',
    status: 'In your bank',
    pill: 'pillPaid',
  },
  {
    group: 'In your bank',
    day: 'Tue',
    date: '10',
    name: '3 payments',
    detail: 'From Mon 9 Nov · Setting spray × 2 and two more',
    amount: '₦68,485',
    status: 'In your bank',
    pill: 'pillPaid',
  },
  {
    group: 'In your bank',
    day: 'Mon',
    date: '9',
    name: '2 payments',
    detail: 'From Fri 6 to Sun 8 Nov · ',
    flag: 'one is disputed',
    amount: '₦173,500',
    status: 'In your bank',
    pill: 'pillPaid',
  },
  {
    group: 'In your bank',
    day: 'Fri',
    date: '6',
    name: 'Birthday glam',
    detail: '1 payment from Thu 5 Nov',
    amount: '₦28,950',
    status: 'In your bank',
    pill: 'pillPaid',
    extra: true,
  },
  {
    group: 'In your bank',
    day: 'Thu',
    date: '5',
    name: '2 shop payments',
    detail: 'From Wed 4 Nov',
    amount: '₦18,200',
    status: 'In your bank',
    pill: 'pillPaid',
    extra: true,
  },
  {
    group: 'In your bank',
    day: 'Wed',
    date: '4',
    name: 'Bridal trial',
    detail: '1 payment from Tue 3 Nov',
    amount: '₦24,025',
    status: 'In your bank',
    pill: 'pillPaid',
    extra: true,
  },
];

function DemoPayoutsPage({ onSelect }: { onSelect: (id: SectionId) => void }) {
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState('');
  const rows = PAYOUT_ROWS.filter((row) => showAll || !row.extra);
  const groups = rows.reduce<string[]>((list, row) => {
    if (!list.includes(row.group)) list.push(row.group);
    return list;
  }, []);

  return (
    <div className={styles.home}>
      <header className={styles.pageHead}>
        <div>
          <h1>Payouts</h1>
          <p>₦38,500 is on its way. It should reach your bank on Monday.</p>
        </div>
        <div className={styles.modeSwitch} role="tablist" aria-label="Earnings or payouts">
          <button
            type="button"
            role="tab"
            aria-selected="false"
            onClick={() => onSelect('earnings')}
          >
            Earnings
          </button>
          <button type="button" role="tab" aria-selected="true">
            Payouts
          </button>
        </div>
      </header>
      {note ? (
        <p className={styles.notice} role="status">
          {note}
        </p>
      ) : null}

      <div className={styles.payoutTop}>
        <section className={styles.ink}>
          <p className={styles.eyebrow}>On its way to your bank</p>
          <p className={styles.big}>₦38,500</p>
          <p className={styles.quiet}>Expected Mon 16 Nov · Access Bank ··2207</p>
          <p className={styles.quiet}>One payment: Bridal makeup deposit, Amara D.</p>
          <div className={styles.rail}>
            <div>
              <i className={styles.railOn} />
              <strong>
                <Check className={styles.tick} strokeWidth={2.25} aria-hidden="true" />
                Paid
              </strong>
              <span>Today, Fri 13 Nov</span>
            </div>
            <div>
              <i className={styles.railMid} />
              <strong>Settling now</strong>
              <span>Paystack, over the weekend</span>
            </div>
            <div>
              <i />
              <strong>In your bank</strong>
              <span>Mon 16 Nov, expected</span>
            </div>
          </div>
        </section>
        <div className={styles.stack}>
          <article className={styles.summaryCard}>
            <span>Settled this month</span>
            <strong>₦373,800</strong>
            <em>8 payouts since 1 Nov</em>
          </article>
          <article className={styles.summaryCard}>
            <span>Last payout</span>
            <strong>₦20,165</strong>
            <em>Today, Fri 13 Nov</em>
          </article>
        </div>
      </div>

      <div className={styles.bookLayout}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>November payouts</h2>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setNote('CSV download is not connected in this demo.')}
            >
              Download CSV
            </button>
          </div>
          {groups.map((group) => (
            <div key={group}>
              <p className={styles.bookGroup}>{group}</p>
              {rows
                .filter((row) => row.group === group)
                .map((row) => (
                  <ScheduleRow
                    key={`${row.date}-${row.name}`}
                    day={row.day}
                    date={row.date}
                    name={row.name}
                    detail={
                      row.flag ? (
                        <>
                          {row.detail}
                          <em className={styles.flag}>{row.flag}</em>
                        </>
                      ) : (
                        row.detail
                      )
                    }
                    amount={row.amount}
                    due=""
                    status={row.status}
                    statusClass={pillOf(row.pill)}
                  />
                ))}
            </div>
          ))}
          <div className={styles.cardFoot}>
            <span>Showing {rows.length} of 9 payouts this month</span>
            <button
              type="button"
              className={`${styles.textLink} ${styles.inlineLink}`}
              onClick={() => setShowAll((open) => !open)}
            >
              {showAll ? 'Show less' : 'Show all'}
              <ArrowRight strokeWidth={1.75} />
            </button>
          </div>
        </section>

        <aside className={styles.bookSide}>
          <section className={styles.collectCard}>
            <p className={styles.dotLine}>
              <i className={styles.dotGreen} />
              Payouts are on
            </p>
            <h2 className={styles.sideTitle}>Access Bank ··2207</h2>
            <p className={styles.quiet}>Adaeze Okoro</p>
            <button
              type="button"
              className={`${styles.ghost} ${styles.spaced}`}
              onClick={() => setNote('Changing the bank account is not connected in this demo.')}
            >
              Change bank account
            </button>
          </section>

          <section className={styles.card}>
            <p className={styles.dotLine}>
              <i className={styles.dotRose} />
              One paid-out payment is disputed
            </p>
            <p className={styles.sideCopy}>
              Funke O. disputed her ₦30,000 soft glam. If it is refunded, ₦28,850 comes off a later
              payout.
            </p>
            <button type="button" className={styles.textLink} onClick={() => onSelect('bookings')}>
              Review dispute
              <ArrowRight strokeWidth={1.75} />
            </button>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sideTitle}>How payouts work</h2>
            <p className={styles.sideCopy}>
              Paystack sends each day’s payments to your bank on the next business day. Payments
              made from Friday to Sunday arrive on Monday.
            </p>
            <p className={styles.sideCopy}>
              Fees are taken out before the payout. Expected dates are estimates until your bank
              confirms.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DemoProfilePage() {
  return (
    <div className={styles.home}>
      <PageIntro title="Profile settings" subtitle="What clients see on your public page." />
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Public profile</h2>
        </div>
        <QuoteRow
          title="Display name"
          meta="Shown on your page"
          amount="Adaeze Okoro"
          status="Live"
          statusClass={styles.pillPaid}
        />
        <QuoteRow
          title="Public page"
          meta="foleio.com/creator/adaeze"
          amount="Live"
          status="Live"
          statusClass={styles.pillPaid}
        />
        <QuoteRow
          title="Category"
          meta="Shown on your page"
          amount="Beauty"
          status="Set"
          statusClass={styles.pillWait}
        />
      </section>
    </div>
  );
}

function DemoAccountPage() {
  return (
    <div className={styles.home}>
      <PageIntro
        title="Account settings"
        subtitle="Email, password, and plan. Nothing here is saved."
      />
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Account</h2>
        </div>
        <QuoteRow
          title="Email"
          meta="adaeze@sample.com"
          amount="Verified"
          status="Verified"
          statusClass={styles.pillPaid}
        />
        <QuoteRow
          title="Password"
          meta="Not changed in this demo"
          amount="—"
          status="Set"
          statusClass={styles.pillWait}
        />
        <QuoteRow
          title="Plan"
          meta="3.5% + ₦100 per sale"
          amount="Free"
          status="Free"
          statusClass={styles.pillDeliver}
        />
      </section>
    </div>
  );
}

function Summary({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <article className={styles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{meta}</em>
    </article>
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
