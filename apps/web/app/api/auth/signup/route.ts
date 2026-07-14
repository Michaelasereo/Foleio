import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { findAuthUserByEmail } from '@/lib/auth/email-otp';
import { prisma } from '@foleio/database';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z
    .string()
    .min(3)
    .regex(/^[a-zA-Z0-9._]+$/),
});

export async function POST(request: Request) {
  try {
    const parsed = signupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const username = parsed.data.username.trim().replace(/^@+/, '').toLowerCase();
    const firstName = parsed.data.firstName.trim();
    const lastName = parsed.data.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();

    const existingWaitlist = await prisma.waitlistEntry.findUnique({
      where: { email },
    });
    if (existingWaitlist?.status === 'activated') {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in.' },
        { status: 409 }
      );
    }
    if (existingWaitlist?.status === 'pending' || existingWaitlist?.status === 'approved') {
      return NextResponse.json(
        {
          error:
            existingWaitlist.status === 'approved'
              ? 'Your invite was already approved. Check your email for the verification code.'
              : 'You already requested an invite with this email. We’ll email you when you’re approved.',
        },
        { status: 409 }
      );
    }

    const existing = await findAuthUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in.' },
        { status: 409 }
      );
    }

    const usernameTaken = await prisma.creator.findUnique({
      where: { username },
      select: { id: true },
    });
    if (usernameTaken) {
      return NextResponse.json(
        { error: 'That username is already taken' },
        { status: 409 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        username,
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || 'Invite request failed' },
        { status: 400 }
      );
    }

    try {
      await prisma.waitlistEntry.create({
        data: {
          name: fullName,
          email,
          status: 'pending',
        },
      });
    } catch (waitlistError) {
      await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
      console.error('waitlist create failed:', waitlistError);
      return NextResponse.json(
        { error: 'Could not save your invite request. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pendingInvite: true,
      email,
    });
  } catch (error) {
    console.error('invite signup failed:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
