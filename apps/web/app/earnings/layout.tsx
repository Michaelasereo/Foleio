import { CreatorToolShellLayout } from '@/components/creator/CreatorToolShellLayout';

export default async function EarningsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CreatorToolShellLayout label="Earnings">{children}</CreatorToolShellLayout>;
}
