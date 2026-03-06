import { FanSupportChat } from '@/components/ai/FanSupportChat';

export default function PublicCreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FanSupportChat />
    </>
  );
}
