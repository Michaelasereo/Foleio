/** Dark Luma tokens for public marketing pages (aligned with auth/legal). */
export const marketingCss = `
.foleio-mkt-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1816;
  color: #ededed;
  font-family: var(--font-body), system-ui, sans-serif;
  font-weight: 300;
}
.foleio-mkt-root h1,
.foleio-mkt-root h2,
.foleio-mkt-root h3,
.foleio-mkt-root h4 {
  font-family: var(--font-body), system-ui, sans-serif;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #fafafa;
}
body:has(.foleio-mkt-root) .foleio-site-footer {
  display: none !important;
}

.foleio-mkt-nav {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 24px;
}
.foleio-mkt-nav-inner {
  max-width: 72rem;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.foleio-mkt-brand {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}
.foleio-mkt-brand img {
  height: 28px;
  width: auto;
  filter: brightness(0) invert(1);
}
.foleio-mkt-nav-links {
  display: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 18px;
}
@media (min-width: 900px) {
  .foleio-mkt-nav-links { display: flex; }
}
.foleio-mkt-nav-link {
  color: rgba(250, 250, 250, 0.55);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s ease;
}
.foleio-mkt-nav-link:hover,
.foleio-mkt-nav-link[data-active="true"] {
  color: #fafafa;
}
.foleio-mkt-nav-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 16px;
  background: #ffffff;
  color: #001035;
  border: 1px solid #000000;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}
.foleio-mkt-nav-cta:hover { opacity: 0.92; }

.foleio-mkt-main {
  flex: 1;
  width: 100%;
}

.foleio-mkt-eyebrow {
  display: inline-block;
  margin-bottom: 1rem;
  color: #8b8f9a;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.foleio-mkt-hero {
  padding: 72px 24px 64px;
  text-align: center;
}
.foleio-mkt-hero-inner {
  max-width: 42rem;
  margin: 0 auto;
}
.foleio-mkt-hero h1 {
  margin: 0 0 1rem;
  font-size: clamp(2rem, 4.5vw, 3.25rem);
  line-height: 1.12;
  color: #fafafa;
}
.foleio-mkt-hero-sub {
  margin: 0 auto;
  max-width: 36rem;
  color: #8b8f9a;
  font-size: 1.0625rem;
  line-height: 1.65;
}
.foleio-mkt-section {
  padding: 64px 24px;
}
.foleio-mkt-section-inner {
  max-width: 56rem;
  margin: 0 auto;
}
.foleio-mkt-section-narrow {
  max-width: 42rem;
  margin: 0 auto;
}
.foleio-mkt-section h2 {
  margin: 0 0 1rem;
  font-size: clamp(1.5rem, 3vw, 2rem);
  line-height: 1.2;
}
.foleio-mkt-body {
  color: rgba(250, 250, 250, 0.72);
  line-height: 1.7;
  font-size: 1rem;
}
.foleio-mkt-muted {
  color: #8b8f9a;
}
.foleio-mkt-card {
  background: #212121;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 24px;
}
.foleio-mkt-card-accent {
  border-color: rgba(255, 255, 255, 0.22);
}
.foleio-mkt-grid-2 {
  display: grid;
  gap: 16px;
}
.foleio-mkt-grid-3 {
  display: grid;
  gap: 16px;
}
@media (min-width: 768px) {
  .foleio-mkt-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .foleio-mkt-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.foleio-mkt-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.0625rem;
  color: #fafafa;
}
.foleio-mkt-card p,
.foleio-mkt-card li {
  color: #8b8f9a;
  font-size: 0.9375rem;
  line-height: 1.6;
}
.foleio-mkt-card ul {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.foleio-mkt-price {
  margin: 0.25rem 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 500;
  color: #fafafa;
  letter-spacing: -0.02em;
}
.foleio-mkt-cta-block {
  padding: 72px 24px;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.foleio-mkt-cta-block h2 {
  margin: 0 0 0.75rem;
  font-size: clamp(1.5rem, 3vw, 2rem);
}
.foleio-mkt-cta-block p {
  margin: 0 auto 1.75rem;
  max-width: 28rem;
  color: #8b8f9a;
}
.foleio-mkt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  padding: 0 22px;
  background: #ffffff;
  color: #001035;
  border: 1px solid #000000;
  border-radius: 9px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  transition: opacity 0.15s ease;
}
.foleio-mkt-btn:hover { opacity: 0.92; }
.foleio-mkt-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  padding: 0 18px;
  margin-left: 10px;
  background: transparent;
  color: #adadad;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.foleio-mkt-btn-ghost:hover {
  color: #fafafa;
  border-color: rgba(255, 255, 255, 0.22);
}
.foleio-mkt-social {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 2.5rem;
  padding-top: 1.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.foleio-mkt-social a {
  color: #8b8f9a;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
}
.foleio-mkt-social a:hover { color: #fafafa; }

.foleio-mkt-footer {
  margin-top: auto;
  padding: 28px 24px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}
.foleio-mkt-footer-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px 4px;
  font-size: 12px;
}
.foleio-mkt-footer-link {
  color: rgba(250, 250, 250, 0.45);
  text-decoration: none;
}
.foleio-mkt-footer-link:hover {
  color: rgba(250, 250, 250, 0.85);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.foleio-mkt-footer-sep {
  user-select: none;
  padding: 0 4px;
  color: rgba(250, 250, 250, 0.25);
}
.foleio-mkt-footer-copy {
  margin: 10px 0 0;
  font-size: 12px;
  color: rgba(250, 250, 250, 0.3);
}

.foleio-mkt-creators-wrap {
  padding: 0 24px 64px;
  max-width: 80rem;
  margin: 0 auto;
  width: 100%;
}
`;

export const BRAND_CLAIM =
  'Africa’s number one creator monetization platform';

export const MARKETING_NAV = [
  { href: '/product/link', label: 'Link' },
  { href: '/product/shop', label: 'Shop' },
  { href: '/product/bookings', label: 'Bookings' },
  { href: '/creators', label: 'Top Creators' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
] as const;

export const MARKETING_FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/creators', label: 'Top Creators' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
  { href: 'mailto:hello@foleio.com', label: 'Contact' },
] as const;
