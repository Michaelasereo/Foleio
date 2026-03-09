import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { UploadService } from '@/lib/storage/upload-service';
import sharp from 'sharp';
import { MAX_THUMBNAIL_SIZE_BYTES, MAX_THUMBNAIL_SIZE_LABEL } from '@/lib/utils/constants';

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPG, PNG or WebP.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_THUMBNAIL_SIZE_LABEL}.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let width = 0;
    let height = 0;
    try {
      const metadata = await sharp(buffer).metadata();
      width = metadata.width || 0;
      height = metadata.height || 0;
    } catch {
      return NextResponse.json(
        {
          error: 'Unable to read image metadata.',
          details: 'Please use a valid JPG, PNG or WebP file.',
        },
        { status: 400 }
      );
    }

    if (width > 0 && height > 0 && (width < 1200 || height < 675)) {
      return NextResponse.json(
        {
          error: 'Image dimensions too small.',
          details: `Uploaded image is ${width}x${height}px. Minimum size is 1200x675px.`,
        },
        { status: 400 }
      );
    }

    const upload = await UploadService.upload({
      userId: user.id,
      file,
      type: 'image',
      maxSizeMB: 5,
    });

    return NextResponse.json({ success: true, url: upload.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to upload image', details: error?.message },
      { status: 500 }
    );
  }
}
