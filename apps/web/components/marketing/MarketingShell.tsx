import Link from 'next/link';
import Image from 'next/image';
import foleioLogo from '../../../../foleio-logo.png';
import {
  MARKETING_FOOTER_LINKS,
  MARKETING_NAV,
  marketingCss,
} from '@/components/marketing/marketingCss';

type MarketingShellProps = {
  children: React.ReactNode;
  /** Current path for active nav styling, e.g. `/product/shop` */
  activePath?: string;
};

export function MarketingShell({ children, activePath }: MarketingShellProps) {
  const year = new Date().getFullYear();

  return (
    <div className="foleio-mkt-root">
      <style dangerouslySetInnerHTML={{ __html: marketingCss }} />

      <header className="foleio-mkt-nav">
        <div className="foleio-mkt-nav-inner">
          <Link href="/" className="foleio-mkt-brand" aria-label="Foleio home">
            <Image src={foleioLogo} alt="Foleio" height={28} priority />
          </Link>

          <nav className="foleio-mkt-nav-links" aria-label="Products">
            {MARKETING_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="foleio-mkt-nav-link"
                data-active={activePath === item.href ? 'true' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link href="/signup" className="foleio-mkt-nav-cta">
            Start for free
          </Link>
        </div>
      </header>

      <div className="foleio-mkt-main">{children}</div>

      <footer className="foleio-mkt-footer">
        <nav className="foleio-mkt-footer-nav" aria-label="Site">
          {MARKETING_FOOTER_LINKS.map((link, index) => (
            <span key={link.href} className="inline-flex items-center">
              {index > 0 ? (
                <span aria-hidden="true" className="foleio-mkt-footer-sep">
                  ·
                </span>
              ) : null}
              <Link href={link.href} className="foleio-mkt-footer-link">
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
        <p className="foleio-mkt-footer-copy">
          © {year} Foleio. Lagos, Nigeria.
        </p>
      </footer>
    </div>
  );
}

type MarketingHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
};

export function MarketingHero({ eyebrow, title, subtitle }: MarketingHeroProps) {
  return (
    <section className="foleio-mkt-hero">
      <div className="foleio-mkt-hero-inner">
        {eyebrow ? <p className="foleio-mkt-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p className="foleio-mkt-hero-sub">{subtitle}</p>
      </div>
    </section>
  );
}

type MarketingCtaProps = {
  title?: string;
  subtitle?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  showSocial?: boolean;
};

export function MarketingCta({
  title = 'Ready to run your creator business?',
  subtitle = 'Set up your public page, add services or products, connect your bank, and share your link.',
  primaryHref = '/signup',
  primaryLabel = 'Start for free',
  secondaryHref,
  secondaryLabel,
  showSocial = true,
}: MarketingCtaProps) {
  return (
    <section className="foleio-mkt-cta-block">
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div>
        <Link href={primaryHref} className="foleio-mkt-btn">
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="foleio-mkt-btn-ghost">
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
      {showSocial ? (
        <div className="foleio-mkt-social">
          {[
            ['Instagram', 'https://instagram.com/foleiohq'],
            ['X / Twitter', 'https://x.com/foleiohq'],
            ['TikTok', 'https://tiktok.com/@foleiohq'],
            ['Email', 'mailto:hello@foleio.com'],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              {...(href.startsWith('http')
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              {label === 'Email' ? 'hello@foleio.com' : label}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}
