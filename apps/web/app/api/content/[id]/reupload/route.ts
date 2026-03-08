import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function createUploadId() {
  return `upl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

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

    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, userId: true } },
      },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    if (content.creator.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (content.type !== 'video') {
      return NextResponse.json({ error: 'Only videos can be re-uploaded' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      fileName?: string;
      fileSize?: number;
      fileType?: string;
    };
    const fileName = body.fileName?.trim() || 'reupload-video';
    const fileSize = Number(body.fileSize || 0);
    const fileType = String(body.fileType || '');

    if (!fileSize || fileSize <= 0) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }
    if (fileSize > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size: 500MB' }, { status: 400 });
    }

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileType}. Allowed: MP4, WebM, MOV, MKV` },
        { status: 400 }
      );
    }

    const uploadId = createUploadId();
    await prisma.upload.create({
      data: {
        id: uploadId,
        userId: user.id,
        creatorId: content.creator.id,
        filename: fileName,
        mimeType: fileType,
        size: fileSize,
        status: 'UPLOADING',
        metadata: {
          originalName: fileName,
          size: fileSize,
          type: fileType,
          action: 'reupload',
          contentId: content.id,
        },
      },
    });

    const muxToken = Buffer.from(
      `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`
    ).toString('base64');

    const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${muxToken}`,
      },
      body: JSON.stringify({
        cors_origin: '*',
        new_asset_settings: {
          playback_policy: ['public'],
          mp4_support: 'standard',
          encoding_tier: 'smart',
        },
      }),
    });

    if (!muxResponse.ok) {
      const errorText = await muxResponse.text();
      await prisma.upload.update({
        where: { id: uploadId },
        data: { status: 'FAILED', error: errorText, failedAt: new Date() },
      });
      return NextResponse.json(
        { error: 'Failed to create Mux upload', details: errorText },
        { status: 500 }
      );
    }

    const muxData = await muxResponse.json();
    const muxUploadId = muxData?.data?.id as string;
    const uploadUrl = muxData?.data?.url as string;

    await prisma.upload.update({
      where: { id: uploadId },
      data: { muxUploadId },
    });

    await prisma.content.update({
      where: { id: content.id },
      data: {
        uploadId,
        muxAssetId: null,
        muxPlaybackId: null,
        isPublished: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Upload URL created. Upload to Mux directly, then processing starts.',
      data: {
        contentId: content.id,
        uploadId,
        muxUploadId,
        uploadUrl,
        status: 'processing',
        statusEndpoint: `/api/upload/status/${muxUploadId}`,
      },
    });
  } catch (error: any) {
    console.error('Reupload video error:', error);
    return NextResponse.json(
      { error: 'Failed to re-upload video', details: error?.message },
      { status: 500 }
    );
  }
}
