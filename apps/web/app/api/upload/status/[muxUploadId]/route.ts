import { NextResponse } from 'next/server';

// Status polling endpoint for Mux video processing
export async function GET(
  request: Request,
  { params }: { params: Promise<{ muxUploadId: string }> }
) {
  const { muxUploadId } = await params;

  console.log('🔍 Checking upload status for:', muxUploadId);

  try {
    // Check Mux upload status
    const muxToken = Buffer.from(
      `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`
    ).toString('base64');

    // Get upload status
    const uploadResponse = await fetch(`https://api.mux.com/video/v1/uploads/${muxUploadId}`, {
      headers: {
        'Authorization': `Basic ${muxToken}`
      }
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('❌ Mux upload status error:', error);
      return NextResponse.json({
        error: 'Failed to check upload status',
        details: error
      }, { status: 500 });
    }

    const uploadData = await uploadResponse.json();
    console.log('📊 Mux upload status:', uploadData.data.status);

    let assetData = null;
    let playbackId = null;
    let playbackUrl = null;
    let contentId = null;

    // First, find the upload record and associated content
    try {
      const { prisma } = await import('@foleio/database');
      const upload = await prisma.upload.findFirst({
        where: { muxUploadId: muxUploadId }
      });

      if (upload) {
        const content = await prisma.content.findFirst({
          where: { uploadId: upload.id }
        });
        if (content) {
          contentId = content.id;
          console.log('📝 Found content ID:', contentId);
        }
      }
    } catch (dbError) {
      console.error('❌ Error finding content:', dbError);
    }

    // If upload has an asset_id, check asset status
    if (uploadData.data.asset_id) {
      console.log('🎬 Checking asset status for:', uploadData.data.asset_id);

      const assetResponse = await fetch(`https://api.mux.com/video/v1/assets/${uploadData.data.asset_id}`, {
        headers: {
          'Authorization': `Basic ${muxToken}`
        }
      });

      if (assetResponse.ok) {
        assetData = await assetResponse.json();
        console.log('🎬 Asset status:', assetData.data.status);

        if (assetData.data.status === 'ready') {
          console.log('🎬 Asset playback IDs:', assetData.data.playback_ids);

          if (assetData.data.playback_ids?.[0]?.id) {
            playbackId = assetData.data.playback_ids[0].id;
            playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`;
            console.log('✅ Video ready! Playback URL:', playbackUrl);
          } else {
            console.log('⚠️ Asset ready but no playback ID found');
          }

          // Update database with completed status
          try {
            // Import prisma here to avoid circular dependencies
            const { prisma } = await import('@foleio/database');

            // Find the upload record first to get the upload ID
            const upload = await prisma.upload.findFirst({
              where: { muxUploadId: muxUploadId }
            });

            if (upload) {
              await prisma.content.updateMany({
                where: { uploadId: upload.id },
                data: {
                  muxAssetId: uploadData.data.asset_id,
                  muxPlaybackId: playbackId,
                }
              });
            }

            await prisma.upload.updateMany({
              where: { id: uploadData.data.id },
              data: {
                status: 'COMPLETED',
                muxAssetId: uploadData.data.asset_id,
                muxPlaybackId: playbackId,
                completedAt: new Date()
              }
            });

            console.log('✅ Database updated with completed status');
          } catch (dbError) {
            console.error('❌ Database update failed:', dbError);
          }
        }
      }
    }

    // Return status response
    const response = {
      uploadId: uploadData.data.id,
      muxUploadId: muxUploadId,
      uploadStatus: uploadData.data.status,
      assetId: uploadData.data.asset_id || null,
      assetStatus: assetData?.data?.status || null,
      playbackId: playbackId,
      playbackUrl: playbackUrl,
      duration: assetData?.data?.duration || null,
      ready: assetData?.data?.status === 'ready' && !!playbackId,
      contentId: contentId, // Include content ID for client to use
      error: uploadData.data.error?.message || assetData?.data?.errors?.[0]?.message || null,
      // Processing metadata
      createdAt: uploadData.data.created_at,
      updatedAt: uploadData.data.updated_at,
      estimatedReadyTime: Date.now() + (2 * 60 * 1000) // 2 minutes from now
    };

    console.log('📋 Status response:', JSON.stringify(response, null, 2));

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Status check error:', error);
    return NextResponse.json({
      error: 'Failed to check upload status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
