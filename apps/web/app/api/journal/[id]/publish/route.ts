import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { notifySubscribersNewEntry } from '@/lib/email/send';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true, username: true, displayName: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const { id } = await params;
    const entry = await prisma.journalEntry.findFirst({
      where: { id, creatorId: creator.id },
    });
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const wasPublished = entry.isPublished;
    const updated = await prisma.journalEntry.update({
      where: { id: entry.id },
      data: {
        isPublished: true,
        status: 'published',
        publishedAt: entry.publishedAt || new Date(),
      },
    });

    if (!wasPublished) {
      await notifySubscribersNewEntry({
        creatorId: creator.id,
        entryTitle: updated.title,
        entrySlug: updated.slug,
        creatorUsername: creator.username,
        creatorName: creator.displayName,
      });
    }

    return NextResponse.json({ entry: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to publish entry', details: error?.message },
      { status: 500 }
    );
  }
}
