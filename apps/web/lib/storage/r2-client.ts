import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
  region?: string;
}

export class R2StorageClient {
  private client: S3Client;
  private config: R2Config;

  constructor(config: R2Config) {
    this.config = config;

    this.client = new S3Client({
      region: config.region || 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  /**
   * Upload file to R2 with automatic content type detection
   */
  async uploadFile(
    key: string,
    file: Buffer | Uint8Array,
    options: {
      contentType?: string;
      metadata?: Record<string, string>;
      isPublic?: boolean;
    } = {}
  ): Promise<{ url: string; key: string; size: number }> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: file,
      ContentType: options.contentType || 'application/octet-stream',
      Metadata: options.metadata,
      ACL: options.isPublic ? 'public-read' : undefined,
    });

    await this.client.send(command);

    const url = options.isPublic
      ? `${this.config.publicUrl}/${key}`
      : await this.getSignedUrl(key);

    return {
      url,
      key,
      size: file.byteLength,
    };
  }

  /**
   * Get signed URL for private files
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.client as any, command as any, { expiresIn });
  }

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Generate unique key for file storage
   */
  generateKey(
    userId: string,
    type: 'avatar' | 'banner' | 'video' | 'image',
    originalFilename: string,
    timestamp: number = Date.now()
  ): string {
    const extension = originalFilename.split('.').pop() || 'bin';
    const random = Math.random().toString(36).substring(2, 15);

    return `${type}s/${userId}/${timestamp}-${random}.${extension}`;
  }
}

// Singleton instance
let r2Client: R2StorageClient | null = null;

export function getR2Client(): R2StorageClient {
  if (!r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId =
      process.env.R2_ACCESS_KEY_ID ||
      process.env.CLOUDFLARE_ACCESS_KEY_ID ||
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.R2_SECRET_ACCESS_KEY ||
      process.env.CLOUDFLARE_SECRET_ACCESS_KEY ||
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName =
      process.env.R2_BUCKET_NAME ||
      process.env.CLOUDFLARE_BUCKET_NAME ||
      process.env.CLOUDFLARE_R2_BUCKET_NAME ||
      'foleio-uploads';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured. Check your environment variables.');
    }

    r2Client = new R2StorageClient({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      publicUrl: process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://pub-${accountId}.r2.dev`,
    });
  }

  return r2Client;
}
