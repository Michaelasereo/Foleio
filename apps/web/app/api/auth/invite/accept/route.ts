import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import {
  confirmAuthUserEmail,
  consumeAuthOtp,
  findAuthUserByEmail,
} from '@/lib/auth/email-otp';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().min(10),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const token = parsed.data.token.trim();
    const code = parsed.data.code.trim();

    const entry = await prisma.waitlistEntry.findUnique({
      where: { inviteToken: token },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    }

    if (entry.status === 'activated') {
      return NextResponse.json(
        { error: 'This invite was already used. Please log in.' },
        { status: 400 }
      );
    }

    if (entry.status !== 'approved') {
      return NextResponse.json(
        { error: 'This invite is not ready yet' },
        { status: 400 }
      );
    }

    const ok = await consumeAuthOtp(entry.email, code, 'invite');
    if (!ok) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    const user = await findAuthUserByEmail(entry.email);
    if (!user) {
      return NextResponse.json(
        { error: 'Account not found for this invite' },
        { status: 404 }
      );
    }

    await confirmAuthUserEmail(user.id);

    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: 'activated',
        activatedAt: new Date(),
      },
    });

    // One-time token so /invite/verify can start a session without re-asking password.
    let sessionTokenHash: string | null = null;
    try {
      const admin = createAdminClient();
      const { data: linkData, error: linkError } =
        await admin.auth.admin.generateLink({
          type: 'magiclink',
          email: entry.email,
        });
      if (linkError) {
        console.error('[invite/accept] generateLink', linkError);
      } else {
        sessionTokenHash = linkData.properties?.hashed_token ?? null;
      }
    } catch (linkErr) {
      console.error('[invite/accept] session token', linkErr);
    }

    return NextResponse.json({
      success: true,
      email: entry.email,
      sessionTokenHash,
    });
  } catch (error) {
    console.error('[invite/accept]', error);
    return NextResponse.json(
      { error: 'Failed to activate invite' },
      { status: 500 }
    );
  }
}
