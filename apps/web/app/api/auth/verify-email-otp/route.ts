import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  confirmAuthUserEmail,
  consumeAuthOtp,
  findAuthUserByEmail,
} from '@/lib/auth/email-otp';

const bodySchema = z.object({
  email: z.string().email(),
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

    const email = parsed.data.email.trim().toLowerCase();
    const code = parsed.data.code.trim();

    const ok = await consumeAuthOtp(email, code, 'signup');
    if (!ok) {
      // Also accept email_verify purpose for login-time resends
      const okVerify = await consumeAuthOtp(email, code, 'email_verify');
      if (!okVerify) {
        return NextResponse.json(
          { error: 'Invalid or expired code' },
          { status: 400 }
        );
      }
    }

    const user = await findAuthUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await confirmAuthUserEmail(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('verify-email-otp failed:', error);
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}
