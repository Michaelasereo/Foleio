import { NextResponse } from 'next/server';
import {
  clearAdminPre2faCookieHeader,
  clearAdminSessionCookieHeader,
} from '@/lib/admin/crypto';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.headers.append('Set-Cookie', clearAdminSessionCookieHeader());
  res.headers.append('Set-Cookie', clearAdminPre2faCookieHeader());
  return res;
}
