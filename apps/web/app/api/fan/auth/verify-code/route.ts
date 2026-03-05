import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { z } from 'zod';
import { setFanSession } from '@/lib/fan-auth/session';

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const code = parsed.data.code.trim();

    const otp = await prisma.fanOTPCode.findFirst({
      where: {
        email,
        code,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otp) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    await prisma.fanOTPCode.update({
      where: { id: otp.id },
      data: { used: true },
    });

    const response = NextResponse.json({ success: true });
    setFanSession(response, email);
    return response;
  } catch (error) {
    console.error('verify-code failed:', error);
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}
