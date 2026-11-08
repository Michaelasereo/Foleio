import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import { revalidatePublicCreator } from '@/lib/creator/revalidate-public';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const row = await prisma.usernameChangeRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      requestedUsername: true,
      creatorId: true,
      creator: { select: { username: true } },
    },
  });

  if (!row || row.status !== 'pending') {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const taken = await prisma.creator.findFirst({
    where: {
      username: row.requestedUsername,
      id: { not: row.creatorId },
    },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.creator.update({
      where: { id: row.creatorId },
      data: {
        username: row.requestedUsername,
        usernameChangedAt: now,
      },
    }),
    prisma.usernameChangeRequest.update({
      where: { id: row.id },
      data: { status: 'approved', reviewedAt: now },
    }),
    prisma.usernameChangeRequest.updateMany({
      where: {
        creatorId: row.creatorId,
        status: 'pending',
        id: { not: row.id },
      },
      data: { status: 'rejected', reviewedAt: now },
    }),
  ]);

  revalidatePublicCreator(row.creator.username);
  revalidatePublicCreator(row.requestedUsername);

  return NextResponse.json({ ok: true, username: row.requestedUsername });
}
