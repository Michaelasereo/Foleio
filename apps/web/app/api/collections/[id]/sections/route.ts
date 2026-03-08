import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const collection = await prisma.collection.findFirst({
      where: { id, creatorId: creator.id },
      select: { id: true },
    });
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const count = await prisma.section.count({
      where: { collectionId: id, parentSectionId: null },
    });

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
    };
    const title = body.title?.trim() || `Module ${count + 1}`;

    const section = await prisma.section.create({
      data: {
        collectionId: id,
        title,
        orderIndex: count,
      },
    });

    return NextResponse.json({ section });
  } catch (error: any) {
    console.error('Create section error:', error);
    return NextResponse.json(
      { error: 'Failed to create section', details: error?.message },
      { status: 500 }
    );
  }
}
