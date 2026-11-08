import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await prisma.usernameChangeRequest.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      requestedUsername: true,
      createdAt: true,
      creator: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  });

  return NextResponse.json({ requests });
}
