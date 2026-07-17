import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { UploadService } from '@/lib/storage/upload-service';
import { revalidatePublicCreator } from '@/lib/creator/revalidate-public';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Banner / business cover uploads → Supabase Storage bucket `crealio`.
 * Mirrors `/api/creator/upload-avatar` for immediate DB persistence.
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
      select: { id: true, username: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPG, PNG, WebP, or GIF.' },
        { status: 400 }
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const uploaded = await UploadService.upload({
      userId: user.id,
      file,
      type: 'banner',
      metadata: {
        creatorId: creator.id,
        uploadType: 'banner',
      },
      optimizeImages: true,
      maxSizeMB: 10,
    });

    await prisma.creator.update({
      where: { id: creator.id },
      data: { bannerUrl: uploaded.url },
    });

    revalidatePublicCreator(creator.username);

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
    console.error('[upload-banner] Error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
