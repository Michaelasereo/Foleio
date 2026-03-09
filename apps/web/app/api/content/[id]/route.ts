import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import MuxService from '@/lib/mux';

export const dynamic = 'force-dynamic';

function normalizeContentPricing(data: {
  contentCategory: 'content' | 'tutorial';
  collectionId?: string | null;
  accessType: 'free' | 'subscription' | 'one_time' | 'collection';
  tutorialPrice?: number | null;
}) {
  const isInCollection = Boolean(data.collectionId);

  if (data.contentCategory !== 'tutorial') {
    return {
      accessType: data.accessType,
      tutorialPrice: data.tutorialPrice ?? null,
      collectionId: data.collectionId ?? null,
      error: null as string | null,
    };
  }

  if (isInCollection) {
    return {
      accessType: 'collection' as const,
      tutorialPrice: 0,
      collectionId: data.collectionId ?? null,
      error: null as string | null,
    };
  }

  if (data.accessType === 'free') {
    return {
      accessType: 'free' as const,
      tutorialPrice: 0,
      collectionId: null,
      error: null as string | null,
    };
  }

  if (!data.tutorialPrice || data.tutorialPrice <= 0) {
    return {
      accessType: data.accessType,
      tutorialPrice: null,
      collectionId: null,
      error: 'This content is now standalone — please set a price.',
    };
  }

  return {
    accessType: data.accessType,
    tutorialPrice: data.tutorialPrice,
    collectionId: null,
    error: null as string | null,
  };
}

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
        { status: 401 }
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
      collectionId,
      thumbnailUrl,
      muxUploadId,
      muxAssetId,
      muxPlaybackId,
    } = body;

    const hasPartialMuxReplacement =
      muxUploadId !== undefined ||
      muxAssetId !== undefined ||
      muxPlaybackId !== undefined;
    const hasCompleteMuxReplacement =
      typeof muxAssetId === 'string' &&
      muxAssetId.length > 0 &&
      typeof muxPlaybackId === 'string' &&
      muxPlaybackId.length > 0;

    if (hasPartialMuxReplacement && !hasCompleteMuxReplacement) {
      return NextResponse.json(
        { error: 'Replacement video is still processing. Please wait until it is ready.' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const mergedContentCategory = (contentCategory || existingContent.contentCategory) as
      | 'content'
      | 'tutorial';
    const mergedCollectionId =
      collectionId !== undefined
        ? collectionId || null
        : existingContent.collectionId;
    const mergedAccessType = (accessType || existingContent.accessType) as
      | 'free'
      | 'subscription'
      | 'one_time'
      | 'collection';
    const rawTutorialPrice =
      tutorialPrice !== undefined
        ? Number(tutorialPrice)
        : existingContent.tutorialPrice;

    const normalizedPricing = normalizeContentPricing({
      contentCategory: mergedContentCategory,
      collectionId: mergedCollectionId,
      accessType: mergedAccessType,
      tutorialPrice: Number.isNaN(rawTutorialPrice) ? null : rawTutorialPrice,
    });

    if (normalizedPricing.error) {
      return NextResponse.json(
        { error: normalizedPricing.error },
        { status: 400 }
      );
    }

    const isReplacingVideo =
      typeof muxAssetId === 'string' &&
      muxAssetId.length > 0 &&
      muxAssetId !== existingContent.muxAssetId;

    if (isReplacingVideo && typeof muxPlaybackId === 'string' && muxPlaybackId.length > 0) {
      const replacementAsset = await MuxService.getAsset(muxAssetId);
      if (!replacementAsset || replacementAsset.status !== 'ready' || replacementAsset.playbackId !== muxPlaybackId) {
        return NextResponse.json(
          { error: 'Replacement video is not ready yet. Please wait and try again.' },
          { status: 400 }
        );
      }
    }

    // Update content
    const updatedContent = await prisma.content.update({
      where: { id: resolvedParams.id },
      data: {
        title: title.trim(),
        description: description?.trim(),
        accessType: normalizedPricing.accessType,
        requiredPlanId,
        tags,
        isPublished,
        ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
        // uploadId references internal Upload table IDs, not Mux upload IDs.
        // Persist only asset/playback IDs for replacement videos.
        ...(muxAssetId !== undefined ? { muxAssetId: muxAssetId || null } : {}),
        ...(muxPlaybackId !== undefined ? { muxPlaybackId: muxPlaybackId || null } : {}),
        contentCategory: mergedContentCategory,
        tutorialPrice: normalizedPricing.tutorialPrice,
        collectionId: normalizedPricing.collectionId,
        publishedAt:
          isPublished && !existingContent.publishedAt ? new Date() : existingContent.publishedAt,
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

    if (isReplacingVideo && existingContent.muxAssetId) {
      MuxService.deleteAsset(existingContent.muxAssetId).catch((muxError) => {
        console.warn('Failed to delete previous Mux asset during replacement:', muxError);
      });
    }

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

    if (content.muxAssetId) {
      await MuxService.deleteAsset(content.muxAssetId);
    }

    await prisma.content.delete({
      where: { id: resolvedParams.id }
    });

    await prisma.creator.update({
      where: { id: content.creator.id },
      data: {
        contentCount: {
          decrement: 1,
        },
      },
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
