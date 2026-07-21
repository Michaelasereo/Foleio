import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { getR2Client } from '@/lib/storage/r2-client';
import { revalidatePublicCreator } from '@/lib/creator/revalidate-public';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function extensionFor(mime: string, fileName: string): string {
  const fromName = fileName.split('.').pop()?.toLowerCase();
  if (fromName === 'pdf' || fromName === 'doc' || fromName === 'docx') return fromName;
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'application/msword') return 'doc';
  if (
    mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  return 'bin';
}

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
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mime =
      file.type ||
      (file.name.toLowerCase().endsWith('.pdf')
        ? 'application/pdf'
        : file.name.toLowerCase().endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : file.name.toLowerCase().endsWith('.doc')
            ? 'application/msword'
            : '');

    if (!ALLOWED_TYPES.has(mime)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use PDF, DOC, or DOCX.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extensionFor(mime, file.name);
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 10);
    const key = `booking-policies/${creator.id}/${timestamp}-${random}.${ext}`;
    const safeDisplayName = file.name
      .normalize('NFKD')
      .replace(/[^\x20-\x7E]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);

    const r2 = getR2Client();
    const uploaded = await r2.uploadFile(key, buffer, {
      contentType: mime || 'application/pdf',
      isPublic: true,
      // Avoid non-ASCII metadata (breaks R2 signatures). Filename lives in DB.
      metadata: {
        creatorid: creator.id,
      },
    });

    const updated = await prisma.creator.update({
      where: { id: creator.id },
      data: {
        bookingPolicyType: 'file',
        bookingPolicyFileUrl: uploaded.url,
        bookingPolicyFileName: safeDisplayName || `booking-policy.${ext}`,
        bookingPolicyLinkUrl: null,
      },
      select: {
        bookingPolicyType: true,
        bookingPolicyFileUrl: true,
        bookingPolicyFileName: true,
        bookingPolicyLinkUrl: true,
      },
    });

    revalidatePath('/bookings');
    revalidatePublicCreator(creator.username);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('[booking-policy/upload]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to upload booking policy',
      },
      { status: 500 }
    );
  }
}
