import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { UploadService } from '@/lib/storage/upload-service';
import { randomUUID } from 'crypto'; // ✅ FIXED: Add missing import
import { checkImageModeration } from '@/lib/services/moderation';
import { MAX_THUMBNAIL_SIZE_BYTES, MAX_THUMBNAIL_SIZE_LABEL } from '@/lib/utils/constants';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large files

export async function POST(request: NextRequest) {
  console.log('🎯 Profile upload API called');

  try {
    // Authenticate user
    console.log('Authenticating user...');
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('❌ Supabase auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('❌ No user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Get creator
    const creator = await prisma.creator.findUnique({
      where: { userId: user.id }
    });

    if (!creator) {
      console.error('❌ Creator not found for user:', user.id);
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    console.log('✅ Creator found:', creator.id);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'avatar' | 'banner' | 'thumbnail';
    const contentId = formData.get('contentId') as string | null;

    console.log('Request received:', { fileName: file?.name, size: file?.size, type: file?.type, uploadType: type });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type || !['avatar', 'banner', 'thumbnail'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "avatar", "banner", or "thumbnail"' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB, stricter for thumbnails)
    const maxSize = type === 'thumbnail' ? MAX_THUMBNAIL_SIZE_BYTES : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size);
      return NextResponse.json(
        {
          error:
            type === 'thumbnail'
              ? `File size must be less than ${MAX_THUMBNAIL_SIZE_LABEL}`
              : 'File size must be less than 10MB',
        },
        { status: 400 }
      );
    }

    if (type === 'thumbnail') {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const moderation = await checkImageModeration(base64, file.type || 'image/jpeg');

      if (moderation.flagged) {
        await prisma.contentReport.create({
          data: {
            contentId: contentId || null,
            reporterEmail: user.email || null,
            reason: 'auto_thumbnail_moderation',
            details: `Confidence: ${moderation.confidence} - ${moderation.reason}`,
            status: 'reviewed',
            reviewedAt: new Date(),
            reviewedBy: 'system',
          },
        });

        return NextResponse.json(
          {
            error:
              "This image doesn't meet our content guidelines. Please upload a different thumbnail.",
            code: 'CONTENT_POLICY_VIOLATION',
          },
          { status: 400 }
        );
      }

      if (moderation.reason === 'moderation_error') {
        await prisma.contentReport.create({
          data: {
            contentId: contentId || null,
            reporterEmail: user.email || null,
            reason: 'thumbnail_moderation_error',
            details: 'Anthropic moderation call failed; upload allowed.',
            status: 'reviewed',
            reviewedAt: new Date(),
            reviewedBy: 'system',
          },
        });
      }
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const uniqueFileName = `profile-${user.id}-${randomUUID()}.${fileExtension}`;

    console.log('Generated filename:', uniqueFileName);

    console.log(`📁 Uploading ${type}: ${file.name} (${file.size} bytes)`);

    // Upload to R2 using our service
    const uploadResult = await UploadService.upload({
      userId: user.id,
      file,
      type: type === 'thumbnail' ? 'image' : type,
      metadata: {
        creatorId: creator.id,
        uploadType: type,
      },
      optimizeImages: true, // ✅ FIXED: Enable image optimization
      maxSizeMB: type === 'avatar' ? 5 : 20, // 5MB for avatar, 20MB for banner
    });

    // Update creator record (only for avatar/banner, thumbnails are for content)
    if (type === 'avatar' || type === 'banner') {
      const updateData = type === 'avatar'
        ? { avatarUrl: uploadResult.url }
        : { bannerUrl: uploadResult.url };

      await prisma.creator.update({
        where: { id: creator.id },
        data: updateData
      });
    }

    console.log(`✅ Creator ${creator.id} updated with new ${type} URL: ${uploadResult.url}`);

    // Return success response with proper structure
    return NextResponse.json({
      success: true,
      message: `${type === 'avatar' ? 'Profile' : 'Banner'} image uploaded successfully`,
      data: {
        url: uploadResult.url,
        key: uploadResult.key,
        type,
        size: uploadResult.size,
        creatorId: creator.id,
        uploadedAt: new Date().toISOString(),
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Profile image upload error:', error);
    const err = error as Error;
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);

    return NextResponse.json(
      {
        error: 'Failed to upload image',
        details: err.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
