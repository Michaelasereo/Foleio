import { cookies } from 'next/headers';
import {
  ADMIN_COOKIE,
  getCookieValue,
  readAdminPre2faToken,
  readAdminSessionToken,
} from '@/lib/admin/crypto';

export type AdminAuthState = {
  adminId: string;
  passwordMustChange?: boolean;
} | null;

export function isAdminAuthed(request: Request): boolean {
  const cookie = request.headers.get('cookie') || '';
  const token = getCookieValue(cookie, ADMIN_COOKIE.session);
  return Boolean(readAdminSessionToken(token));
}

export function getAdminIdFromRequest(request: Request): string | null {
  const cookie = request.headers.get('cookie') || '';
  const token = getCookieValue(cookie, ADMIN_COOKIE.session);
  return readAdminSessionToken(token)?.adminId ?? null;
}

export function getAdminPre2faIdFromRequest(request: Request): string | null {
  const cookie = request.headers.get('cookie') || '';
  const token = getCookieValue(cookie, ADMIN_COOKIE.pre2fa);
  return readAdminPre2faToken(token)?.adminId ?? null;
}

export async function isAdminAuthedFromServerCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get(ADMIN_COOKIE.session)?.value;
  return Boolean(readAdminSessionToken(adminSession));
}

export async function getAdminIdFromServerCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get(ADMIN_COOKIE.session)?.value;
  return readAdminSessionToken(adminSession)?.adminId ?? null;
}
