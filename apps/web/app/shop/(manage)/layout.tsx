import { CreatorToolShellLayout } from '@/components/creator/CreatorToolShellLayout';

export default async function CreatorShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CreatorToolShellLayout label="Shop">{children}</CreatorToolShellLayout>;
}
