import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';

const waitlistSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = waitlistSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const { name, email } = parsed.data;

    await prisma.waitlistEntry.create({
      data: {
        name,
        email: email.toLowerCase(),
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    // Unique constraint error - return 400 as requested.
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}
