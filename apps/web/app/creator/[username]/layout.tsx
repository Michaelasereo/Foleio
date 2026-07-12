import { TryFoleioFab } from '@/components/creator/TryFoleioFab';

export default function PublicCreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <TryFoleioFab />
    </>
  );
}
