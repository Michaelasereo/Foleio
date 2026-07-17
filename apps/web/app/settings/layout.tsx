import { CreatorToolShellLayout } from '@/components/creator/CreatorToolShellLayout';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CreatorToolShellLayout label="Settings">{children}</CreatorToolShellLayout>;
}
