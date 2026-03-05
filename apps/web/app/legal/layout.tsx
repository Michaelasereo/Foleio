import Link from 'next/link';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 pb-6">
        <Link href="/" className="font-display text-3xl text-primary">
          Foleio
        </Link>
      </div>
      {children}
      <footer className="max-w-3xl mx-auto px-6 pb-16 pt-4 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/legal/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/legal/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/legal/creator-agreement" className="hover:text-foreground">
            Creator Agreement
          </Link>
        </div>
      </footer>
    </div>
  );
}
