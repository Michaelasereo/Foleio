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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size: 500MB' }, { status: 400 });
    }

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: MP4, WebM, MOV, MKV` },
        { status: 400 }
      );
    }

    const uploadId = createUploadId();
    await prisma.upload.create({
      data: {
        id: uploadId,
        userId: user.id,
        creatorId: content.creator.id,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        status: 'UPLOADING',
        metadata: {
          originalName: file.name,
          size: file.size,
          type: file.type,
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

    const fileBuffer = await file.arrayBuffer();
    const uploadResult = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileBuffer,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });

    if (!uploadResult.ok) {
      const errorText = await uploadResult.text();
      await prisma.upload.update({
        where: { id: uploadId },
        data: { status: 'FAILED', error: errorText, failedAt: new Date() },
      });
      return NextResponse.json(
        { error: 'Failed to upload video to Mux', details: errorText },
        { status: 500 }
      );
    }

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
      message: 'Video uploaded. Processing has started.',
      data: {
        contentId: content.id,
        uploadId,
        muxUploadId,
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
