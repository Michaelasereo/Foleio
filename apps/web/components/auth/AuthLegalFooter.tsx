import Link from 'next/link';

const YEAR = new Date().getFullYear();

interface AuthLegalFooterProps {
  /** Dark matches auth/creator shells; light matches sidebar dashboard pages. */
  tone?: 'dark' | 'light';
}

export function AuthLegalFooter({ tone = 'dark' }: AuthLegalFooterProps) {
  const linkClass =
    tone === 'light'
      ? 'text-muted-foreground no-underline transition-colors hover:text-foreground hover:underline hover:underline-offset-[3px]'
      : 'text-white/45 no-underline transition-colors hover:text-white/85 hover:underline hover:underline-offset-[3px]';
  const sepClass =
    tone === 'light'
      ? 'select-none px-1 text-muted-foreground/70'
      : 'select-none px-1 text-white/25';
  const copyClass =
    tone === 'light'
      ? 'm-0 text-xs text-muted-foreground/70'
      : 'm-0 text-xs text-white/30';

  return (
    <footer className="foleio-auth-legal relative z-10 mt-auto flex flex-col items-center gap-2 px-4 pb-2 pt-7 text-center">
      <nav
        className="foleio-auth-legal-links flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5 text-xs leading-snug"
        aria-label="Legal"
      >
        <Link href="/legal/terms" className={linkClass}>
          Terms &amp; Conditions
        </Link>
        <span aria-hidden="true" className={`foleio-auth-legal-sep ${sepClass}`}>
          ·
        </span>
        <Link href="/legal/privacy" className={linkClass}>
          Privacy Policy
        </Link>
        <span aria-hidden="true" className={`foleio-auth-legal-sep ${sepClass}`}>
          ·
        </span>
        <Link href="/legal/data-policy" className={linkClass}>
          Data Policy
        </Link>
      </nav>
      <p className={`foleio-auth-legal-copy ${copyClass}`}>
        © {YEAR} Foleio. All rights reserved.
      </p>
    </footer>
  );
}
