import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { ensureDbUser } from '@/lib/auth/ensure-db-user';
import { shouldAutoUpgradeToPremium } from '@/lib/config/pilot';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL } from '@/lib/utils/constants';

// BigInt JSON serialization patch - fixes "Cannot serialize BigInt" errors
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

// Also patch NextResponse.json to handle BigInt
const originalNextResponseJson = NextResponse.json;
(NextResponse as any).json = function(data: any, options?: any) {
  const safeData = JSON.parse(JSON.stringify(data, (key: string, value: any) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }));
  return originalNextResponseJson.call(this, safeData, options);
};

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large uploads

export async function POST(request: Request) {
  console.log('📤 SERVER DEBUG: Upload API called at', new Date().toISOString());
  console.log('📤 SERVER DEBUG: Request method:', request.method);
  console.log('📤 SERVER DEBUG: Content-Type:', request.headers.get('content-type'));
  console.log('📤 SERVER DEBUG: Content-Length:', request.headers.get('content-length'));
  console.log('📤 SERVER DEBUG: User-Agent:', request.headers.get('user-agent'));

  let uploadId: string | undefined;
  let createdContent: { id: string } | null = null;

  try {
    // 1. Initialize Supabase client
    console.log('🔧 SERVER DEBUG: Step 1 - Initializing Supabase client');
    const supabase = await createRouteHandlerClient();

    // 2. Authenticate user
    console.log('🔐 SERVER DEBUG: Step 2 - Authenticating user');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('❌ SERVER DEBUG: Auth error:', authError);
      console.error('❌ SERVER DEBUG: Auth error details:', authError.message);
      return NextResponse.json(
        { error: 'Authentication failed', details: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('❌ SERVER DEBUG: No user found in session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log(`✅ SERVER DEBUG: User authenticated: ${user.id} (${user.email})`);
    await ensureDbUser(user);

    // 3. Get or create creator
    let creator = await prisma.creator.findUnique({
      where: { userId: user.id }
    });

    if (!creator) {
      console.log(`🆕 Creating creator for user ${user.id}`);
      const autoPremium = shouldAutoUpgradeToPremium(user.email);
      creator = await prisma.creator.create({
        data: {
          userId: user.id,
          username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
          displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New Creator',
          platformPlan: autoPremium ? 'premium' : 'starter',
          platformSubscriptionActive: true,
          platformSubscriptionEndsAt: autoPremium
            ? null
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          balance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          payoutThreshold: 500000,
          currentBalance: 0,
          trustScore: 100
        }
      });
    }

    console.log(`✅ SERVER DEBUG: Creator found: ${creator.id} (${creator.username})`);

    // 4. Parse form data
    console.log('📦 SERVER DEBUG: Step 4 - Parsing form data');
    const formData = await request.formData();
    console.log('📦 SERVER DEBUG: FormData keys:', Array.from(formData.keys()));

    const file = formData.get('file') as File;

    if (!file) {
      console.error('❌ SERVER DEBUG: No file provided in form data');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`📁 SERVER DEBUG: File received: ${file.name} (${file.size} bytes, ${file.type})`);
    console.log(`📁 SERVER DEBUG: File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`📁 SERVER DEBUG: File last modified: ${new Date(file.lastModified).toISOString()}`);

    // 5. Basic validation
    console.log('🔍 SERVER DEBUG: Step 5 - File validation');
    console.log('🔍 SERVER DEBUG: Checking file size...');

    if (file.size === 0) {
      console.error('❌ SERVER DEBUG: File is empty!');
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      console.error(
        `❌ SERVER DEBUG: File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB (max: ${MAX_UPLOAD_SIZE_LABEL})`
      );
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_UPLOAD_SIZE_LABEL}` },
        { status: 400 }
      );
    }

    // Check file type
    console.log('🔍 SERVER DEBUG: Checking file type...');
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    console.log('🔍 SERVER DEBUG: File type:', file.type);
    console.log('🔍 SERVER DEBUG: Allowed types:', allowedTypes);

    if (!allowedTypes.includes(file.type)) {
      console.error(`❌ SERVER DEBUG: Unsupported file type: ${file.type}`);
      console.error('❌ SERVER DEBUG: Allowed types:', allowedTypes);
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: MP4, WebM, MOV, MKV` },
        { status: 400 }
      );
    }

    console.log('✅ SERVER DEBUG: File validation passed');

    // 6. Create upload record
    console.log('🗄️ SERVER DEBUG: Step 6 - Creating upload record');
    uploadId = `upl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🗄️ SERVER DEBUG: Generated upload ID:', uploadId);

    try {
      await prisma.upload.create({
        data: {
          id: uploadId,
          userId: user.id,
          creatorId: creator.id,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          status: 'UPLOADING', // ← FIXED: Use correct enum value (UPLOADING, not 'uploading')
          metadata: {
            originalName: file.name,
            size: file.size,
            type: file.type
          }
        }
      });
      console.log(`✅ SERVER DEBUG: Upload record created successfully: ${uploadId}`);
    } catch (dbError) {
      console.error('❌ SERVER DEBUG: Failed to create upload record:', dbError);
      throw new Error('Database error: Failed to create upload record');
    }

    // 7. Simple Mux upload (direct, no queue for now)
    console.log('🎬 SERVER DEBUG: Step 7 - Mux upload setup');
    console.log('🎬 SERVER DEBUG: Checking Mux credentials...');
    console.log('🎬 SERVER DEBUG: MUX_TOKEN_ID exists:', !!process.env.MUX_TOKEN_ID);
    console.log('🎬 SERVER DEBUG: MUX_TOKEN_SECRET exists:', !!process.env.MUX_TOKEN_SECRET);

    const muxToken = Buffer.from(
      `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`
    ).toString('base64');

    console.log('🎬 SERVER DEBUG: Mux token generated (first 10 chars):', muxToken.substring(0, 10) + '...');

    // Create Mux direct upload URL
    console.log('🎬 SERVER DEBUG: Creating Mux upload URL...');
    const muxRequestBody = {
      cors_origin: '*',
      max_size: MAX_UPLOAD_SIZE_BYTES,
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'standard',
        encoding_tier: 'smart'
      }
    };
    console.log('🎬 SERVER DEBUG: Mux request body:', JSON.stringify(muxRequestBody, null, 2));

    const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${muxToken}`
      },
      body: JSON.stringify(muxRequestBody)
    });

    console.log('🎬 SERVER DEBUG: Mux API response status:', muxResponse.status, muxResponse.statusText);
    console.log('🎬 SERVER DEBUG: Mux API response headers:', Object.fromEntries(muxResponse.headers.entries()));

    if (!muxResponse.ok) {
      const errorText = await muxResponse.text();
      console.error('❌ SERVER DEBUG: Mux API error:', {
        status: muxResponse.status,
        statusText: muxResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(muxResponse.headers.entries())
      });

      // Update upload status to failed
      console.log('❌ SERVER DEBUG: Updating upload status to FAILED');
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: 'FAILED',
          error: `Mux API error: ${muxResponse.status} - ${errorText}`,
          failedAt: new Date()
        }
      });

      if (errorText.includes('Free plan is limited to 10 assets')) {
        throw new Error(
          'Video upload limit reached on the current Mux account. Delete old Mux assets or upgrade Mux plan, then try again.'
        );
      }

      throw new Error(`Mux API error: ${muxResponse.status} - ${errorText}`);
    }

    console.log('✅ SERVER DEBUG: Mux API call successful');
    const muxData = await muxResponse.json();
    console.log('🎬 SERVER DEBUG: Mux response data:', JSON.stringify(muxData, null, 2));

    const uploadUrl = muxData.data.url;
    const muxUploadId = muxData.data.id;

    // IMPORTANT: asset_id and playback_ids are NOT available immediately!
    // They become available after video processing is complete (async)
    const assetId = null; // Will be set when processing completes
    const playbackId = null; // Will be set when processing completes

    console.log(`✅ SERVER DEBUG: Mux upload created: ${muxUploadId}`);
    console.log(`📤 SERVER DEBUG: Upload URL: ${uploadUrl}`);
    console.log(`🎬 SERVER DEBUG: Asset ID: ${assetId} (null until processing complete)`);
    console.log(`🎬 SERVER DEBUG: Playback ID: ${playbackId} (null until processing complete)`);

    // Update upload record with muxUploadId
    try {
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          muxUploadId: muxUploadId
        }
      });
      console.log('✅ SERVER DEBUG: Upload record updated with muxUploadId');
    } catch (updateError) {
      console.error('❌ SERVER DEBUG: Failed to update upload record with muxUploadId:', updateError);
    }

    // 8. Upload file to Mux
    console.log('📤 SERVER DEBUG: Step 8 - Uploading file to Mux');
    console.log('📤 SERVER DEBUG: Converting file to buffer...');
    const fileBuffer = await file.arrayBuffer();
    console.log('📤 SERVER DEBUG: File buffer size:', fileBuffer.byteLength, 'bytes');

    console.log('📤 SERVER DEBUG: Starting file upload to Mux...');
    const uploadStart = Date.now();

    const uploadResult = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileBuffer,
      headers: {
        'Content-Type': file.type
      }
    });

    const uploadTime = Date.now() - uploadStart;
    console.log('⏱️ SERVER DEBUG: File upload completed in', uploadTime + 'ms');
    console.log('📤 SERVER DEBUG: Upload result status:', uploadResult.status, uploadResult.statusText);

    if (!uploadResult.ok) {
      const uploadErrorText = await uploadResult.text();
      console.error('❌ SERVER DEBUG: File upload to Mux failed:', uploadErrorText);
      throw new Error(`File upload failed: ${uploadResult.status} - ${uploadErrorText}`);
    }

    console.log('✅ SERVER DEBUG: File uploaded to Mux successfully');

    // 9. Update database with success
    console.log('🗄️ SERVER DEBUG: Step 9 - Updating database with success');
    console.log('🗄️ SERVER DEBUG: Updating upload record...');

    try {
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: 'COMPLETED', // ← FIXED: Use correct enum value (COMPLETED, not 'completed')
          muxAssetId: assetId,
          muxPlaybackId: playbackId,
          url: `https://stream.mux.com/${playbackId}.m3u8`,
          completedAt: new Date()
        }
      });
      console.log('✅ SERVER DEBUG: Upload record updated successfully');
    } catch (updateError) {
      console.error('❌ SERVER DEBUG: Failed to update upload record:', updateError);
      throw new Error('Database error: Failed to update upload status');
    }

    // 10. Create content record
    console.log('📝 SERVER DEBUG: Step 10 - Creating content record');

    // DEBUG: Log all the data we're about to send
    console.log('🎯 DEBUG - Content creation data:');
    console.log('- creatorId:', creator.id, '(type:', typeof creator.id, ')');
    console.log('- creatorId as string:', creator.id.toString());
    console.log('- title:', file.name.replace(/\.[^/.]+$/, ""));
    console.log('- uploadId:', uploadId);
    console.log('- muxAssetId:', assetId);
    console.log('- muxPlaybackId:', playbackId);
    console.log('- fileSizeBytes:', BigInt(file.size.toString()), '(type:', typeof BigInt(file.size.toString()), ')');

    const contentData = {
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      description: '',
      type: 'video', // Schema field is 'type'
      creatorId: creator.id.toString(), // Schema expects 'creatorId' as String
      uploadId: uploadId, // Schema field is 'uploadId'
      muxAssetId: assetId, // Schema field is 'muxAssetId'
      muxPlaybackId: playbackId, // Schema field is 'muxPlaybackId'
      fileSizeBytes: BigInt(file.size.toString()), // Schema field is 'fileSizeBytes'
      isPublished: false, // Schema field is 'isPublished'
      accessType: 'subscription', // Schema field is 'accessType'
      contentCategory: 'content' // Schema field is 'contentCategory'
    };

    console.log('📝 SERVER DEBUG: Final content data to create:', JSON.stringify(contentData, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2
    ));

    try {
      createdContent = await prisma.content.create({
        data: contentData
      });
      console.log(`✅ SERVER DEBUG: Content created successfully: ${createdContent.id}`);
    } catch (contentError) {
      console.error('❌ SERVER DEBUG: CONTENT CREATION FAILED!');
      const err = contentError as any;
      console.error('❌ SERVER DEBUG: Error code:', err.code);
      console.error('❌ SERVER DEBUG: Error message:', err.message);
      console.error('❌ SERVER DEBUG: Error meta:', err.meta);
      console.error('❌ SERVER DEBUG: Error stack:', err.stack);

      // Specific error handling
      if (err.code === 'P2002') {
        console.error('🔄 Unique constraint violation on:', err.meta?.target);
        throw new Error(`Content creation failed: ${err.meta?.target} already exists`);
      }
      if (err.code === 'P2003') {
        console.error('🔗 Foreign key constraint failed on:', err.meta?.field_name);
        throw new Error(`Content creation failed: Invalid ${err.meta?.field_name}`);
      }

      throw new Error(`Database error: Failed to create content record - ${err.message}`);
    }

    // 11. Return success
    console.log('🎉 SERVER DEBUG: Step 11 - Upload process completed successfully');

    // Video uploaded but processing - provide polling endpoint
    const successResponse = {
      success: true,
      message: 'Video uploaded successfully and processing',
      data: {
        uploadId,
        contentId: createdContent.id.toString(),
        muxUploadId,
        // Video is processing - these will be null until processing completes
        assetId: null,
        playbackId: null,
        playbackUrl: null,
        // Processing status
        status: 'processing',
        // Frontend can poll this endpoint for status updates
        statusEndpoint: `/api/upload/status/${muxUploadId}`,
        // Estimated processing time
        estimatedReadyTime: Date.now() + (2 * 60 * 1000), // 2 minutes estimate
        message: 'Your video is being processed. This usually takes 1-3 minutes.'
      }
    };

    console.log('✅ SERVER DEBUG: Returning success response:', JSON.stringify(successResponse, null, 2));
    return NextResponse.json(successResponse);

  } catch (error: any) {
    console.error('❌ SERVER DEBUG: Upload API error occurred');
    console.error('❌ SERVER DEBUG: Error message:', error.message);
    console.error('❌ SERVER DEBUG: Error stack:', error.stack);
    console.error('❌ SERVER DEBUG: Error type:', error.constructor.name);

    // Try to update upload status to failed if we have an uploadId
    if (typeof uploadId !== 'undefined') {
      try {
        console.log('❌ SERVER DEBUG: Attempting to mark upload as failed');
        await prisma.upload.update({
          where: { id: uploadId },
          data: {
            status: 'FAILED',
            error: error.message,
            failedAt: new Date()
          }
        });
        console.log('✅ SERVER DEBUG: Upload marked as failed in database');
      } catch (dbError) {
        console.error('❌ SERVER DEBUG: Failed to update upload status:', dbError);
      }
    }

    // Clean up created content if it exists
    if (createdContent) {
      try {
        console.log('🧹 SERVER DEBUG: Cleaning up created content:', createdContent.id.toString());
        await prisma.content.delete({
          where: { id: createdContent.id }
        });
        console.log('✅ SERVER DEBUG: Content cleanup successful');
      } catch (cleanupError) {
        console.error('❌ SERVER DEBUG: Content cleanup failed:', cleanupError);
      }
    }

    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error.message,
        debug: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          type: error.constructor.name,
          uploadId: uploadId || 'not-created'
        } : undefined
      },
      { status: 500 }
    );
  }
}

