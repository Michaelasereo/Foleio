import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import {
  isValidUsername,
  normalizeUsername,
  usernameChangeAllowed,
  usernameChangeEligibleAt,
} from '@/lib/creator/username-change';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const username = normalizeUsername(String(body.username || ''));
    if (!isValidUsername(username)) {
      return NextResponse.json(
        {
          error:
            'Username must be 3-30 chars and contain only lowercase letters, numbers, hyphens, and underscores',
        },
        { status: 400 }
      );
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        username: true,
        usernameChangedAt: true,
        user: { select: { createdAt: true } },
      },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    if (username === creator.username) {
      return NextResponse.json({ error: 'That is already your username' }, { status: 400 });
    }

    if (usernameChangeAllowed(creator.usernameChangedAt, creator.user.createdAt)) {
      return NextResponse.json(
        { error: 'You can change your username now. Save it from the preview page.' },
        { status: 400 }
      );
    }

    const taken = await prisma.creator.findFirst({
      where: { username, id: { not: creator.id } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }

    const pendingConflict = await prisma.usernameChangeRequest.findFirst({
      where: {
        requestedUsername: username,
        status: 'pending',
        creatorId: { not: creator.id },
      },
      select: { id: true },
    });
    if (pendingConflict) {
      return NextResponse.json({ error: 'Username is already requested' }, { status: 400 });
    }

    await prisma.usernameChangeRequest.updateMany({
      where: { creatorId: creator.id, status: 'pending' },
      data: { status: 'rejected', reviewedAt: new Date() },
    });

    const requestRow = await prisma.usernameChangeRequest.create({
      data: {
        creatorId: creator.id,
        requestedUsername: username,
      },
      select: { id: true, requestedUsername: true },
    });

    const eligibleAt = usernameChangeEligibleAt(creator.usernameChangedAt, creator.user.createdAt);

    return NextResponse.json({
      ok: true,
      requestedUsername: requestRow.requestedUsername,
      eligibleAt: eligibleAt.toISOString(),
    });
  } catch (error) {
    console.error('Username change request failed:', error);
    return NextResponse.json({ error: 'Could not submit username request' }, { status: 500 });
  }
}
