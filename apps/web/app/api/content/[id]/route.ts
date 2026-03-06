import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get content with creator check
    const content = await prisma.content.findUnique({
      where: { id: resolvedParams.id },
      include: {
        creator: {
          select: { id: true, userId: true }
        }
      }
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Check if user owns this content
    if (content.creator.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Serialize and return
    const serializedContent = {
      id: content.id,
      title: content.title,
      description: content.description,
      type: content.type,
      thumbnailUrl: content.thumbnailUrl,
      muxAssetId: content.muxAssetId,
      muxPlaybackId: content.muxPlaybackId,
      durationSeconds: content.durationSeconds,
      fileSizeBytes: content.fileSizeBytes?.toString(),
      accessType: content.accessType,
      requiredPlanId: content.requiredPlanId,
      contentCategory: content.contentCategory,
      tutorialPrice: content.tutorialPrice,
      collectionId: content.collectionId,
      isPublished: content.isPublished,
      tags: content.tags,
      createdAt: content.createdAt.toISOString(),
      updatedAt: content.updatedAt?.toISOString()
    };

    return NextResponse.json({ content: serializedContent });

  } catch (error: any) {
    console.error('Content fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get content with creator check
    const existingContent = await prisma.content.findUnique({
      where: { id: resolvedParams.id },
      include: {
        creator: {
          select: { id: true, userId: true }
        }
      }
    });

    if (!existingContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Check if user owns this content
    if (existingContent.creator.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      accessType,
      requiredPlanId,
      tags,
      isPublished,
      contentCategory,
      tutorialPrice,
      collectionId
    } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Update content
    const updatedContent = await prisma.content.update({
      where: { id: resolvedParams.id },
      data: {
        title: title.trim(),
        description: description?.trim(),
        accessType,
        requiredPlanId,
        tags,
        isPublished,
        contentCategory,
        tutorialPrice: tutorialPrice ? parseInt(tutorialPrice) : null,
        collectionId,
        publishedAt: isPublished && !existingContent.publishedAt ? new Date() : existingContent.publishedAt
      },
      include: {
        creator: {
          select: { username: true, displayName: true }
        }
      }
    });

    // Serialize response
    const serializedContent = {
      id: updatedContent.id,
      title: updatedContent.title,
      description: updatedContent.description,
      type: updatedContent.type,
      accessType: updatedContent.accessType,
      requiredPlanId: updatedContent.requiredPlanId,
      contentCategory: updatedContent.contentCategory,
      tutorialPrice: updatedContent.tutorialPrice,
      collectionId: updatedContent.collectionId,
      isPublished: updatedContent.isPublished,
      tags: updatedContent.tags,
      updatedAt: updatedContent.updatedAt?.toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Content updated successfully',
      content: serializedContent
    });

  } catch (error: any) {
    console.error('Content update error:', error);
    return NextResponse.json(
      { error: 'Failed to update content', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get content with creator check
    const content = await prisma.content.findUnique({
      where: { id: resolvedParams.id },
      include: {
        creator: {
          select: { id: true, userId: true }
        }
      }
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Check if user owns this content
    if (content.creator.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete content (cascade will handle related records)
    await prisma.content.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully'
    });

  } catch (error: any) {
    console.error('Content delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete content', details: error.message },
      { status: 500 }
    );
  }
}
