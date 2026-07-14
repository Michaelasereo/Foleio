import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { UploadService } from '@/lib/storage/upload-service';

export const dynamic = 'force-dynamic';

/**
 * Avatar uploads go to Supabase Storage bucket `crealio` (same as banners).
 * Requires bucket + policies from scripts/crealio-storage-policies.sql
 */
export async function POST(request: Request) {
  try {
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
      userId: user.id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    const uploaded = await UploadService.upload({
      userId: user.id,
      file,
      type: 'avatar',
      metadata: {
        creatorId: creator.id,
        uploadType: 'avatar',
      },
      optimizeImages: true,
      maxSizeMB: 5,
    });

    await prisma.creator.update({
      where: { id: creator.id },
      data: { avatarUrl: uploaded.url },
    });

    console.log('[upload-avatar] Supabase + DB success:', uploaded.url);

    return NextResponse.json({
      success: true,
      url: uploaded.url,
      key: uploaded.key,
      data: {
        url: uploaded.url,
        key: uploaded.key,
      },
    });
  } catch (error: unknown) {
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
