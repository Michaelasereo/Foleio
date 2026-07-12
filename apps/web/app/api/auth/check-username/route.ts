import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { z } from 'zod';

const querySchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_-]+$/),
});

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username') || '';
    const parsed = querySchema.safeParse({ username: username.toLowerCase() });

    if (!parsed.success) {
      return NextResponse.json({
        available: false,
        reason: 'invalid',
      });
    }

    const existing = await prisma.creator.findUnique({
      where: { username: parsed.data.username },
      select: { id: true },
    });

    return NextResponse.json({
      available: !existing,
      reason: existing ? 'taken' : 'ok',
    });
  } catch (error) {
    console.error('username check failed:', error);
    return NextResponse.json(
      { available: false, reason: 'error' },
      { status: 500 }
    );
  }
}
