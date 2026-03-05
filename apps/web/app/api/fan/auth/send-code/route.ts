import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { z } from 'zod';
import { resend, FROM_EMAIL } from '@/lib/email/resend';

const bodySchema = z.object({
  email: z.string().email(),
});

function shouldSendEmail() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RESEND_SEND_IN_DEV === 'true'
  );
}

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
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.fanOTPCode.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    if (shouldSendEmail()) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Your Foleio login code: ${code}`,
        html: `
          <div style="background:#F5F0E8;padding:24px;font-family:Arial,sans-serif;">
            <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
              <h1 style="margin:0 0 16px;color:#F97316;">Foleio</h1>
              <p>Your one-time login code is:</p>
              <div style="font-size:30px;font-weight:700;letter-spacing:3px;color:#C2410C;background:#FFF7ED;border:1px solid #FED7AA;padding:14px;border-radius:10px;text-align:center;">
                ${code}
              </div>
              <p style="margin-top:16px;color:#666;">This code expires in 10 minutes.</p>
              <p style="margin-top:20px;color:#7a7a7a;font-size:12px;">Powered by Foleio · noreply@foleio.com</p>
            </div>
          </div>
        `,
      });
    } else {
      console.log(`📧 Fan OTP skipped in dev for ${email}. Code: ${code}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('send-code failed:', error);
    return NextResponse.json(
      { error: 'Failed to send code' },
      { status: 500 }
    );
  }
}
