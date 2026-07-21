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

/** R2/S3 user metadata must be ASCII — non-ASCII filenames break request signatures. */
function sanitizeS3Metadata(
  meta?: Record<string, string>
): Record<string, string> | undefined {
  if (!meta) return undefined;
  const out: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(meta)) {
    const key = rawKey.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const value = String(rawValue)
      .normalize('NFKD')
      .replace(/[^\x20-\x7E]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);
    if (key && value) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
      // AWS SDK v3 default flexible checksums break Cloudflare R2 signatures.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
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
    const body =
      file instanceof Buffer ? new Uint8Array(file.buffer, file.byteOffset, file.byteLength) : file;

    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: body,
      ContentType: options.contentType || 'application/octet-stream',
      Metadata: sanitizeS3Metadata(options.metadata),
      // R2 does not use S3 ACLs; public access is via r2.dev / custom domain.
    });

    await this.client.send(command);

    const url = options.isPublic
      ? `${this.config.publicUrl}/${key}`
      : await this.getSignedUrl(key);

    return {
      url,
      key,
      size: body.byteLength,
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

function resolvePublicUrl(accountId: string): string {
  const raw =
    process.env.R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    '';
  const cleaned = raw.trim().replace(/\/+$/, '');

  const isPlaceholder =
    !cleaned ||
    /your-r2-domain\.com/i.test(cleaned) ||
    /example\.com/i.test(cleaned) ||
    /placeholder/i.test(cleaned);

  if (!isPlaceholder) {
    return cleaned;
  }

  // Wrong fallback shape: pub-{accountId}.r2.dev is NOT valid.
  // Use the bucket Public Development URL from Cloudflare → R2 → bucket → Settings.
  throw new Error(
    'CLOUDFLARE_R2_PUBLIC_URL is missing or still a placeholder (e.g. your-r2-domain.com). ' +
      'In Cloudflare Dashboard → R2 → your bucket → Settings → Public access, enable the r2.dev subdomain ' +
      'and set CLOUDFLARE_R2_PUBLIC_URL to that URL (https://pub-xxxx.r2.dev) with no trailing slash.'
  );
}

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
      accountId: accountId.trim(),
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      bucketName: bucketName.trim(),
      publicUrl: resolvePublicUrl(accountId),
    });
  }

  return r2Client;
}

/** Test helper / hot-reload: drop cached client after config changes. */
export function resetR2Client() {
  r2Client = null;
}
