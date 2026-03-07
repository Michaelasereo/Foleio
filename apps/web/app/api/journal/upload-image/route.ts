import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { UploadService } from '@/lib/storage/upload-service';

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
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    const upload = await UploadService.upload({
      userId: user.id,
      file,
      type: 'image',
      maxSizeMB: 20,
    });

    return NextResponse.json({ success: true, url: upload.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to upload image', details: error?.message },
      { status: 500 }
    );
  }
}
