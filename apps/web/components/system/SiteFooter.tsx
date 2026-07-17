import Link from 'next/link';

const YEAR = new Date().getFullYear();

const LINKS = [
  { href: '/about', label: 'About' },
  { href: '/legal/terms', label: 'Terms & Conditions' },
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/data-policy', label: 'Data Policy' },
  { href: '/legal/creator-agreement', label: 'Creator Agreement' },
] as const;

export function SiteFooter() {
  return (
    <footer className="foleio-site-footer">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.foleio-site-footer {
  position: relative;
  z-index: 10;
  margin-top: auto;
  padding: 28px 24px 20px;
  background: #1a1816;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
  font-family: var(--font-body), system-ui, sans-serif;
}
.foleio-site-footer-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px 4px;
  font-size: 12px;
  line-height: 1.4;
}
.foleio-site-footer-link {
  color: rgba(250, 250, 250, 0.45);
  text-decoration: none;
  transition: color 0.15s ease;
}
.foleio-site-footer-link:hover {
  color: rgba(250, 250, 250, 0.85);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.foleio-site-footer-sep {
  user-select: none;
  padding: 0 4px;
  color: rgba(250, 250, 250, 0.25);
}
.foleio-site-footer-copy {
  margin: 10px 0 0;
  font-size: 12px;
  color: rgba(250, 250, 250, 0.3);
}
`,
        }}
      />
      <nav className="foleio-site-footer-nav" aria-label="Site">
        {LINKS.map((link, index) => (
          <span key={link.href} className="inline-flex items-center">
            {index > 0 ? (
              <span aria-hidden="true" className="foleio-site-footer-sep">
                ·
              </span>
            ) : null}
            <Link href={link.href} className="foleio-site-footer-link">
              {link.label}
            </Link>
          </span>
        ))}
      </nav>
      <p className="foleio-site-footer-copy">© {YEAR} Foleio. All rights reserved.</p>
    </footer>
  );
}
