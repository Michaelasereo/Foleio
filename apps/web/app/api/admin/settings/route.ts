import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminAuthed } from '@/lib/admin/auth';
import {
  isDojahKycRequired,
  REQUIRE_DOJAH_KYC_KEY,
  setPlatformSetting,
} from '@/lib/config/platform-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    requireDojahKyc: await isDojahKycRequired(),
  });
}

const patchSchema = z.object({
  requireDojahKyc: z.boolean(),
});

export async function PATCH(request: Request) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || 'Invalid request' },
      { status: 400 }
    );
  }

  await setPlatformSetting(REQUIRE_DOJAH_KYC_KEY, parsed.data.requireDojahKyc, 'admin');

  return NextResponse.json({
    requireDojahKyc: parsed.data.requireDojahKyc,
  });
}
