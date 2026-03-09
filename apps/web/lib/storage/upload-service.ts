import { createClient } from '@supabase/supabase-js';
import { getR2Client } from '@/lib/storage/r2-client';
import { MAX_UPLOAD_SIZE_MB } from '@/lib/utils/constants';

// Conditional import for file-type with fallback
let fileTypeFromBuffer: any;

// Emergency fallback for file-type validation
fileTypeFromBuffer = async (buffer: Buffer): Promise<{ ext: string; mime: string } | undefined> => {
    const header = buffer.slice(0, 12);

    // PNG
    if (header.slice(0, 8).toString() === '\x89PNG\r\n\x1a\n') {
      return { ext: 'png', mime: 'image/png' };
    }

    // JPEG
    if (header.slice(0, 2).toString() === '\xff\xd8') {
      return { ext: 'jpg', mime: 'image/jpeg' };
    }

    // GIF
    if (header.slice(0, 6).toString() === 'GIF87a' || header.slice(0, 6).toString() === 'GIF89a') {
      return { ext: 'gif', mime: 'image/gif' };
    }

    // WebP
    if (header.slice(0, 4).toString() === 'RIFF' &&
        header.slice(8, 12).toString() === 'WEBP') {
      return { ext: 'webp', mime: 'image/webp' };
    }

    // MP4
    if (header.slice(4, 8).toString() === 'ftyp') {
      return { ext: 'mp4', mime: 'video/mp4' };
    }

    return undefined;
};

// file-type is optional - we use the fallback implementation above
// If file-type is needed, it can be loaded at runtime via dynamic import

export interface UploadOptions {
  userId: string;
  file: File;
  type: 'avatar' | 'banner' | 'video' | 'image';
  metadata?: Record<string, string>;
  optimizeImages?: boolean;
  maxSizeMB?: number;
}

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  size: number;
  type: string;
  metadata: Record<string, any>;
}

export class UploadService {
  private static async optimizeImageBuffer(
    buffer: Buffer,
    maxWidth: number,
    maxHeight: number
  ): Promise<{ buffer: Buffer; optimized: boolean }> {
    try {
      const sharp = (await import('sharp')).default;
      const optimizedBuffer = await sharp(buffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
      return { buffer: optimizedBuffer, optimized: true };
    } catch (error) {
      console.warn('[upload-service] sharp unavailable, skipping optimization:', error);
      return { buffer, optimized: false };
    }
  }

  /**
   * Main upload method - handles all file types
   */
  static async upload(options: UploadOptions): Promise<UploadResult> {
    const {
      userId,
      file,
      type,
      metadata = {},
      optimizeImages = true,
      maxSizeMB = type === 'video' ? MAX_UPLOAD_SIZE_MB : 50,
    } = options;

    try {
      // 1. Validate file
      await this.validateFile(file, {
        maxSizeMB,
        allowedTypes: this.getAllowedTypes(type),
      });

      // 2. Handle video uploads (use existing Mux integration)
      if (type === 'video') {
        return await this.uploadVideoToMux(userId, file, metadata);
      }

      // 3. Handle image uploads (use Supabase Storage)
      return await this.uploadImageToSupabase(userId, file, type, metadata);

    } catch (error: any) {
      console.error(`Upload failed for ${type}:`, error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Upload images to Supabase Storage with optimization
   */
  private static async uploadImageToSupabase(
    userId: string,
    file: File,
    type: string,
    metadata: Record<string, string>
  ): Promise<UploadResult> {
    // Initialize Supabase client with service role key (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ Service role key bypasses RLS policies
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(arrayBuffer);
    let contentType = file.type;
    let optimized = false;

    // 2. Optimize image if it's an image file
    if (file.type.startsWith('image/')) {
      const maxWidth = type === 'avatar' ? 400 : 1920;
      const maxHeight = type === 'avatar' ? 400 : 1080;
      const optimization = await this.optimizeImageBuffer(buffer, maxWidth, maxHeight);
      buffer = optimization.buffer;
      optimized = optimization.optimized;
      if (optimized) {
        contentType = 'image/webp';
        console.log(`🖼️ Optimized ${type}: ${file.size} → ${buffer.length} bytes`);
      }
    }

    // 3. Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = optimized ? 'webp' : (file.name.split('.').pop() || 'jpg');
    const filename = `${type}s/${userId}/${timestamp}-${random}.${extension}`;

    console.log(`📤 Uploading ${type} to Supabase Storage: ${filename}`);

    // 4. Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('crealio')
      .upload(filename, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
        metadata: {
          ...metadata,
          userId,
          originalName: file.name,
          originalType: file.type,
          originalSize: file.size.toString(),
          optimized: optimized.toString(),
          uploadedAt: new Date().toISOString(),
        }
      });

    if (error) {
      console.error('❌ Supabase upload failed:', error);
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // 5. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('crealio')
      .getPublicUrl(filename);

    console.log(`✅ ${type} uploaded to Supabase: ${publicUrl}`);

    return {
      success: true,
      url: publicUrl,
      key: filename,
      size: buffer.byteLength,
      type: contentType,
      metadata: {
        ...metadata,
        userId,
        originalName: file.name,
        storage: 'supabase',
        optimized,
        originalSize: file.size,
        optimizedSize: buffer.byteLength,
      },
    };
  }

  /**
   * Upload videos to Mux (redirect to dedicated endpoint)
   */
  private static async uploadVideoToMux(
    userId: string,
    file: File,
    metadata: Record<string, string>
  ): Promise<UploadResult> {
    console.log('🎬 Video upload to Mux - redirecting to /api/upload/stream');

    // Videos should use the dedicated stream endpoint with UploadManager
    throw new Error('Video uploads must use /api/upload/stream endpoint with UploadManager.');
  }

  /**
   * Get signed URL for private content (like videos)
   */
  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const r2Client = getR2Client();
    return await r2Client.getSignedUrl(key, expiresIn);
  }

  /**
   * Delete uploaded file
   */
  static async deleteFile(key: string): Promise<void> {
    const r2Client = getR2Client();
    await r2Client.deleteFile(key);
  }

  /**
   * Validate file before upload
   */
  private static async validateFile(file: File, options: { maxSizeMB: number; allowedTypes: string[] }): Promise<void> {
    const { maxSizeMB, allowedTypes } = options;

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error(`File size must be less than ${maxSizeMB}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Additional validation can be added here
    if (file.size === 0) {
      throw new Error('File is empty');
    }
  }

  private static getAllowedTypes(type: string): string[] {
    const types: Record<string, string[]> = {
      avatar: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      banner: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
      video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'],
    };

    return types[type] || [];
  }
}
