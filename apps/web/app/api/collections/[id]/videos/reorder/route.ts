import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export async function PATCH(
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

    const body = (await request.json()) as { videoIds?: string[]; sectionId?: string };
    const videoIds = body.videoIds ?? [];
    const sectionId = body.sectionId;
    if (!sectionId || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json(
        { error: 'sectionId and non-empty videoIds are required' },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      videoIds.map((videoId, index) =>
        prisma.sectionContent.updateMany({
          where: { sectionId, contentId: videoId },
          data: { orderIndex: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reorder section videos error:', error);
    return NextResponse.json(
      { error: 'Failed to reorder section videos', details: error?.message },
      { status: 500 }
    );
  }
}
