import { AdminLoginGate } from '@/components/admin/AdminLoginGate';
import { AdminShell } from '@/components/admin/AdminShell';
import { isAdminAuthedFromServerCookies } from '@/lib/admin/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthed = await isAdminAuthedFromServerCookies();

  if (!isAuthed) {
    return <AdminLoginGate />;
  }

  return <AdminShell>{children}</AdminShell>;
}
