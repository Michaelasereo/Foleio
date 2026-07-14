import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import { createAndSendAuthOtp } from '@/lib/auth/email-otp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  id: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com').replace(/\/$/, '');
}

export async function POST(request: Request) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const email = parsed.data.email?.trim().toLowerCase();
    const entry = parsed.data.id
      ? await prisma.waitlistEntry.findUnique({ where: { id: parsed.data.id } })
      : email
        ? await prisma.waitlistEntry.findUnique({ where: { email } })
        : null;

    if (!entry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
    }

    if (entry.status === 'activated') {
      return NextResponse.json(
        { error: 'This invite was already activated' },
        { status: 400 }
      );
    }

    const inviteToken =
      entry.inviteToken && entry.status === 'approved'
        ? entry.inviteToken
        : randomBytes(24).toString('hex');

    const updated = await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: 'approved',
        approvedAt: entry.approvedAt || new Date(),
        inviteToken,
      },
    });

    const verifyUrl = `${appUrl()}/invite/verify?token=${encodeURIComponent(inviteToken)}`;
    await createAndSendAuthOtp(updated.email, 'invite', { verifyUrl });

    return NextResponse.json({
      success: true,
      entry: updated,
      verifyUrl,
    });
  } catch (error) {
    console.error('[admin/waitlist/approve]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to approve invite',
      },
      { status: 500 }
    );
  }
}
