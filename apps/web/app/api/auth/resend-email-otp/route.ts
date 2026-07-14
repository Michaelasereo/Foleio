import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { createAndSendAuthOtp, findAuthUserByEmail } from '@/lib/auth/email-otp';

const bodySchema = z.object({
  email: z.string().email(),
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

    const waitlist = await prisma.waitlistEntry.findUnique({
      where: { email },
      select: { status: true },
    });
    if (waitlist?.status === 'pending') {
      return NextResponse.json(
        {
          error:
            'Your invite is still pending approval. We’ll email a code when you’re approved.',
        },
        { status: 400 }
      );
    }
    if (waitlist?.status === 'approved') {
      return NextResponse.json(
        {
          error:
            'Your invite was approved. Use the verification link and code from your invite email.',
        },
        { status: 400 }
      );
    }

    const user = await findAuthUserByEmail(email);

    if (!user) {
      // Don't reveal whether the email exists
      return NextResponse.json({ success: true });
    }

    if (user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Email is already verified. Please log in.' },
        { status: 400 }
      );
    }

    await createAndSendAuthOtp(email, 'signup');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('resend-email-otp failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to resend verification code',
      },
      { status: 500 }
    );
  }
}
