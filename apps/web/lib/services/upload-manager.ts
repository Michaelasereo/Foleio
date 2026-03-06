import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@foleio/database';

export class UploadManager {
  private static instance: UploadManager;

  static getInstance(): UploadManager {
    if (!UploadManager.instance) {
      UploadManager.instance = new UploadManager();
    }
    return UploadManager.instance;
  }

  async uploadVideo(file: File, userId: string, creatorId: string) {
    const uploadId = `upload_${uuidv4()}`;

    try {
      console.log(`🚀 Starting upload ${uploadId} for user ${userId}`);

      // 1. Validate file
      await this.validateFile(file);

      // 2. Create upload record in database
      const uploadRecord = await prisma.upload.create({
        data: {
          id: uploadId,
          userId,
          creatorId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          status: 'UPLOADING', // ✅ FIXED: Use correct enum value
          metadata: {
            originalName: file.name,
            size: file.size,
            type: file.type
          }
        }
      });

      // 3. Direct upload to Mux (no queue for now)
      const muxResult = await this.uploadToMux(file);

      // 4. Update database with Mux details
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: 'COMPLETED', // ✅ FIXED: Use correct enum value
          muxAssetId: muxResult.assetId,
          muxPlaybackId: muxResult.playbackId,
          url: muxResult.playbackUrl,
          completedAt: new Date()
        }
      });

      // 5. Create content entry
      const content = await prisma.content.create({
        data: {
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          description: '',
          type: 'video',
          creatorId,
          uploadId,
          muxAssetId: muxResult.assetId,
          muxPlaybackId: muxResult.playbackId,
          fileSizeBytes: BigInt(file.size),
          isPublished: false,
          accessType: 'subscription',
          contentCategory: 'content',
          metadata: {
            duration: muxResult.duration,
            aspectRatio: muxResult.aspectRatio,
            resolution: muxResult.resolution,
            originalName: file.name,
            mimeType: file.type
          }
        }
      });

      return {
        success: true,
        uploadId,
        contentId: content.id,
        playbackUrl: muxResult.playbackUrl,
        assetId: muxResult.assetId
      };

    } catch (error) {
      console.error(`Upload ${uploadId} failed:`, error);

      // Update database with failure
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: 'FAILED', // ✅ FIXED: Use correct enum value
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date()
        }
      }).catch(e => console.error('Failed to update error:', e));

      throw error;
    }
  }

  private async validateFile(file: File): Promise<void> {
    const errors: string[] = [];

    // Size validation (5GB max)
    if (file.size > 5 * 1024 * 1024 * 1024) {
      errors.push('File exceeds 5GB limit');
    }

    // Type validation
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push(`Unsupported file type: ${file.type}. Allowed: MP4, WebM, MOV, AVI, MKV`);
    }

    // Extension validation
    const ext = file.name.toLowerCase().split('.').pop();
    const allowedExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv', 'flv'];
    if (!ext || !allowedExts.includes(ext)) {
      errors.push(`Invalid file extension: .${ext}`);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  private async uploadToMux(file: File): Promise<{
    assetId: string;
    playbackId: string;
    playbackUrl: string;
    duration: number;
    aspectRatio: string;
    resolution: string;
  }> {
    // Create direct upload to Mux
    const muxToken = Buffer.from(
      `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`
    ).toString('base64');

    // 1. Create upload URL
    const uploadResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${muxToken}`
      },
      body: JSON.stringify({
        cors_origin: process.env.NEXT_PUBLIC_APP_URL || '*',
        new_asset_settings: {
          playback_policy: ['public'],
          mp4_support: 'standard',
          encoding_tier: 'smart'
        }
      })
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Mux upload creation failed: ${uploadResponse.status} ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    const uploadUrl = uploadData.data.url;
    const uploadId = uploadData.data.id;

    // 2. Upload file directly
    const uploadResult = await fetch(uploadUrl, {
      method: 'PUT',
      body: await file.arrayBuffer(),
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResult.ok) {
      throw new Error(`File upload failed: ${uploadResult.status}`);
    }

    // 3. Wait for asset to be ready (poll)
    const assetId = uploadData.data.asset_id;
    const playbackId = uploadData.data.playback_ids?.[0]?.id;

    if (!assetId) {
      throw new Error('No asset ID returned from Mux');
    }

    // Poll for asset status
    const asset = await this.waitForAssetReady(assetId, muxToken);

    return {
      assetId,
      playbackId: asset.playback_ids?.[0]?.id || playbackId,
      playbackUrl: `https://stream.mux.com/${asset.playback_ids?.[0]?.id || playbackId}.m3u8`,
      duration: asset.duration || 0,
      aspectRatio: asset.aspect_ratio || '16:9',
      resolution: asset.max_stored_resolution || '1920x1080'
    };
  }

  private async waitForAssetReady(assetId: string, muxToken: string): Promise<any> {
    const maxAttempts = 30; // 30 * 2 seconds = 1 minute timeout
    const delay = 2000; // 2 seconds

    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
        headers: {
          'Authorization': `Basic ${muxToken}`
        }
      });

      if (response.ok) {
        const asset = await response.json();

        if (asset.data.status === 'ready') {
          return asset.data;
        } else if (asset.data.status === 'errored') {
          throw new Error(`Asset processing failed: ${asset.data.errors?.message || 'Unknown error'}`);
        }
        // Still processing, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error('Asset processing timeout');
  }
}
