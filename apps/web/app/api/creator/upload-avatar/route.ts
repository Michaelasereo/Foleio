import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { getR2Client } from '@/lib/storage/r2-client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('[upload-avatar] ENV check:', {
      hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
      hasAccessKey:
        !!process.env.CLOUDFLARE_ACCESS_KEY_ID || !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      hasSecret:
        !!process.env.CLOUDFLARE_SECRET_ACCESS_KEY || !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      hasBucket: !!process.env.CLOUDFLARE_BUCKET_NAME || !!process.env.CLOUDFLARE_R2_BUCKET_NAME,
      hasSupabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPG, PNG or WebP.' },
        { status: 400 }
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    console.log('[upload-avatar] Upload start', {
      creatorId: creator.id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension =
      file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const key = `avatars/${creator.id}-${Date.now()}.${extension}`;
    const r2 = getR2Client();
    const uploaded = await r2.uploadFile(key, buffer, {
      contentType: file.type,
      metadata: {
        creatorId: creator.id,
        uploadType: 'avatar',
        userId: user.id,
      },
      isPublic: true,
    });
    const uploadUrl = uploaded.url;
    const uploadKey = uploaded.key;
    console.log('[upload-avatar] R2 upload success:', uploadUrl);

    await prisma.creator.update({
      where: { id: creator.id },
      data: { avatarUrl: uploadUrl },
    });

    console.log('[upload-avatar] DB updated for creator:', creator.id);

    return NextResponse.json({
      success: true,
      url: uploadUrl,
      key: uploadKey,
      data: {
        url: uploadUrl,
        key: uploadKey,
      },
    });
  } catch (error: any) {
    console.error('[upload-avatar] Error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
