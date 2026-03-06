import { cookies } from 'next/headers';

export function isAdminCookieValid(value?: string | null): boolean {
  if (!value) return false;
  return value === process.env.ADMIN_SECRET;
}

export function isAdminAuthed(request: Request): boolean {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/admin_session=([^;]+)/);
  return isAdminCookieValid(match?.[1] || null);
}

export async function isAdminAuthedFromServerCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get('admin_session')?.value;
  return isAdminCookieValid(adminSession);
}
