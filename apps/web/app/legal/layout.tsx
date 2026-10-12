import { SiteChrome } from '@/components/site/SiteChrome';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteChrome>{children}</SiteChrome>;
}
