import { CreatorToolShellLayout } from '@/components/creator/CreatorToolShellLayout';

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CreatorToolShellLayout label="Analytics">{children}</CreatorToolShellLayout>;
}
