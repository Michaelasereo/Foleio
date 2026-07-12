import Image from 'next/image';
import Link from 'next/link';
import foleioLogo from '../../../../foleio-logo.png';
import { authCss } from './styles';

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="foleio-auth-root relative flex min-h-screen flex-col">
      <style dangerouslySetInnerHTML={{ __html: authCss }} />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image
            src={foleioLogo}
            alt="Foleio"
            className="h-8 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
            priority
          />
        </Link>
        <span className="hidden font-mono text-[11px] uppercase tracking-widest text-white/35 sm:inline">
          // creator platform
        </span>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-6">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 space-y-2 text-center sm:text-left">
            <h1 className="foleio-auth-title font-body text-3xl font-medium tracking-tight sm:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="foleio-auth-sub text-sm leading-relaxed">{subtitle}</p>
            ) : null}
          </div>

          <div className="foleio-auth-card p-6 sm:p-8">{children}</div>
        </div>
      </main>

      <div className="foleio-auth-footer relative z-10 mt-auto">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-6 text-sm sm:flex-row sm:justify-between sm:px-10">
          <div className="flex items-center gap-2">
            <Image
              src={foleioLogo}
              alt="Foleio"
              className="h-5 w-auto"
              style={{ filter: 'brightness(0) invert(1)', opacity: 0.7 }}
            />
            <span className="text-white/35">© {new Date().getFullYear()}</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/about">About</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
