'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function FanLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/fan/auth/logout', { method: 'POST' });
    router.push('/fan/login');
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Logout
    </Button>
  );
}
