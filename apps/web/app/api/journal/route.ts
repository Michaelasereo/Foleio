import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { estimateReadTimeMinutes, sanitizeJournalHtml, slugify } from '@/lib/journal/utils';

export const dynamic = 'force-dynamic';

async function getCreatorId() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return creator?.id ?? null;
}

async function uniqueSlugForCreator(creatorId: string, title: string) {
  const base = slugify(title) || 'untitled';
  let slug = base;
  let i = 1;
  while (true) {
    const exists = await prisma.journalEntry.findFirst({
      where: { creatorId, slug },
      select: { id: true },
    });
    if (!exists) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

export async function GET() {
  try {
    const creatorId = await getCreatorId();
    if (!creatorId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const entries = await prisma.journalEntry.findMany({
      where: { creatorId },
      orderBy: [{ updatedAt: 'desc' }],
    });

    return NextResponse.json({ entries });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load journal entries', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const creatorId = await getCreatorId();
    if (!creatorId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json()) as {
      title: string;
      subtitle?: string;
      content?: string;
      coverImage?: string | null;
      tags?: string[];
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const cleanContent = sanitizeJournalHtml(body.content || '<p></p>');
    const slug = await uniqueSlugForCreator(creatorId, title);

    const entry = await prisma.journalEntry.create({
      data: {
        creatorId,
        title,
        subtitle: body.subtitle?.trim() || null,
        slug,
        content: cleanContent,
        coverImage: body.coverImage || null,
        tags: (body.tags || []).map((tag) => tag.trim()).filter(Boolean),
        readTime: estimateReadTimeMinutes(cleanContent),
        status: 'draft',
      },
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create journal entry', details: error?.message },
      { status: 500 }
    );
  }
}
