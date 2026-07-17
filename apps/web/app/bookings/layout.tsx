import { CreatorToolShellLayout } from '@/components/creator/CreatorToolShellLayout';

export default async function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CreatorToolShellLayout label="Bookings">{children}</CreatorToolShellLayout>;
}
