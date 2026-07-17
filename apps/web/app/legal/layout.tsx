import Link from 'next/link';
import Image from 'next/image';
import foleioLogo from '../../../../foleio-logo.png';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="foleio-legal-root min-h-screen">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.foleio-legal-root {
  background: #1a1816;
  color: #fafafa;
  font-family: var(--font-body), system-ui, sans-serif;
}
.foleio-legal-root h1,
.foleio-legal-root h2,
.foleio-legal-root h3,
.foleio-legal-root h4,
.foleio-legal-root .legal-content h2 {
  font-family: var(--font-body), system-ui, sans-serif !important;
  color: #fafafa !important;
  letter-spacing: -0.02em;
}
.foleio-legal-root h1 {
  font-weight: 500;
}
.foleio-legal-root .text-muted-foreground {
  color: rgba(250, 250, 250, 0.62) !important;
}
.foleio-legal-root a.foleio-legal-brand {
  display: inline-flex;
  align-items: center;
}
.foleio-legal-root a.foleio-legal-brand img {
  height: 28px;
  width: auto;
  filter: brightness(0) invert(1);
}
.foleio-legal-root .legal-content {
  color: rgba(250, 250, 250, 0.88);
  line-height: 1.7;
}
.foleio-legal-root .legal-content h2 {
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  font-size: 1.25rem;
  font-weight: 500;
}
.foleio-legal-root .legal-content p,
.foleio-legal-root .legal-content li {
  margin-bottom: 0.75rem;
  color: rgba(250, 250, 250, 0.88);
}
.foleio-legal-root .legal-content a {
  color: #fafafa;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.foleio-legal-footer {
  max-width: 48rem;
  margin: 0 auto;
  padding: 8px 24px 64px;
}
.foleio-legal-footer-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 4px;
  font-size: 13px;
}
.foleio-legal-footer-link {
  color: rgba(250, 250, 250, 0.7);
  text-decoration: none;
  transition: color 0.15s ease;
}
.foleio-legal-footer-link:hover {
  color: #fafafa;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.foleio-legal-footer-sep {
  user-select: none;
  padding: 0 4px;
  color: rgba(250, 250, 250, 0.35);
}
body:has(.foleio-legal-root) .foleio-site-footer {
  display: none !important;
}
`,
        }}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="foleio-legal-brand">
          <Image src={foleioLogo} alt="Foleio" height={28} priority />
        </Link>
      </div>
      {children}
      <footer className="foleio-legal-footer">
        <nav className="foleio-legal-footer-nav" aria-label="Legal">
          <Link href="/legal/terms" className="foleio-legal-footer-link">
            Terms &amp; Conditions
          </Link>
          <span aria-hidden="true" className="foleio-legal-footer-sep">
            ·
          </span>
          <Link href="/legal/privacy" className="foleio-legal-footer-link">
            Privacy Policy
          </Link>
          <span aria-hidden="true" className="foleio-legal-footer-sep">
            ·
          </span>
          <Link href="/legal/data-policy" className="foleio-legal-footer-link">
            Data Policy
          </Link>
          <span aria-hidden="true" className="foleio-legal-footer-sep">
            ·
          </span>
          <Link href="/legal/creator-agreement" className="foleio-legal-footer-link">
            Creator Agreement
          </Link>
        </nav>
      </footer>
    </div>
  );
}
