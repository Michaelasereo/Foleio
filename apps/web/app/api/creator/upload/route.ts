import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { getR2Client } from '@/lib/storage/r2-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const uploadType = String(formData.get('type') || '').trim();

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!uploadType) {
      return NextResponse.json({ error: 'Upload type is required' }, { status: 400 });
    }

    let key = '';
    if (uploadType === 'product-image' || uploadType === 'portfolio') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid image type. Use JPG, PNG or WebP.' },
          { status: 400 }
        );
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image must be under 5MB.' }, { status: 400 });
      }
      const extension =
        file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      key =
        uploadType === 'portfolio'
          ? `portfolio/${creator.id}/${Date.now()}.${extension}`
          : `products/images/${creator.id}-${Date.now()}.${extension}`;
    } else if (uploadType === 'digital-product') {
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
      }
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: 'PDF must be under 50MB.' }, { status: 400 });
      }
      key = `products/digital/${creator.id}-${Date.now()}.pdf`;
    } else {
      return NextResponse.json({ error: 'Unsupported upload type.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const r2 = getR2Client();
    const uploaded = await r2.uploadFile(key, buffer, {
      contentType: file.type,
      metadata: {
        creatorId: creator.id,
        uploadType,
        userId: user.id,
      },
      isPublic: true,
    });

    return NextResponse.json({
      success: true,
      url: uploaded.url,
      key: uploaded.key,
      fileName: file.name,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
