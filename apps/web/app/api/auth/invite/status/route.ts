import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token')?.trim();
  const email = searchParams.get('email')?.trim().toLowerCase();

  if (token) {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { inviteToken: token },
      select: {
        email: true,
        name: true,
        status: true,
        inviteToken: true,
      },
    });
    if (!entry) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    }
    return NextResponse.json({
      email: entry.email,
      name: entry.name,
      status: entry.status,
      token: entry.inviteToken,
    });
  }

  if (email) {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { email },
      select: {
        status: true,
        inviteToken: true,
        email: true,
      },
    });
    return NextResponse.json({
      status: entry?.status || null,
      hasInviteToken: Boolean(entry?.inviteToken),
      email: entry?.email || email,
    });
  }

  return NextResponse.json({ error: 'token or email required' }, { status: 400 });
}
