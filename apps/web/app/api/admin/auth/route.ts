import { NextResponse } from 'next/server';

/** Legacy password-only admin auth — use /api/admin/auth/login */
export async function POST() {
  return NextResponse.json(
    { error: 'Use email + password login at /api/admin/auth/login' },
    { status: 410 }
  );
}
