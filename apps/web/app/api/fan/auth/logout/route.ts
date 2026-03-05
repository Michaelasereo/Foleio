import { NextResponse } from 'next/server';
import { clearFanSession } from '@/lib/fan-auth/session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearFanSession(response);
  return response;
}
