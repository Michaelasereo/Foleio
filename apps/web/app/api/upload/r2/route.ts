import { NextRequest, NextResponse } from 'next/server';
import { withCreatorSessionValidation } from '@/lib/auth/session-middleware';
import { withRateLimit, rateLimiters } from '@/lib/rate-limit/rate-limiter';
import { uploadSecurity } from '@/lib/security/upload-security';
import { costMonitor } from '@/lib/billing/cost-monitor';
import { uploadGateway } from '@/lib/upload/upload-gateway';
import { mediaProcessingQueue } from '@/lib/queue/processing-queue';
import { systemMonitor } from '@/lib/monitoring/system-monitor';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID =
  process.env.CLOUDFLARE_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY =
  process.env.CLOUDFLARE_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  return withCreatorSessionValidation(request, async (session, user) => {
    try {
      // Apply rate limiting for uploads
      const rateLimitResult = await withRateLimit(request, rateLimiters.upload);

      if (!rateLimitResult.allowed) {
        systemMonitor.trackApiCall('/api/upload/r2', 'POST', 429, Date.now() - startTime, user.id);
        return NextResponse.json(
          {
            error: 'Upload rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((rateLimitResult.result.resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              ...rateLimitResult.headers,
              'Retry-After': Math.ceil((rateLimitResult.result.resetTime - Date.now()) / 1000).toString(),
            },
          }
        );
      }

      const formData = await request.formData();
      const file = formData.get('file') as File;
      const fileName = formData.get('fileName') as string;

      if (!file) {
        systemMonitor.trackApiCall('/api/upload/r2', 'POST', 400, Date.now() - startTime, user.id);
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Comprehensive security validation
      const validation = await uploadSecurity.validateFile(file, user.id, 'image');
      if (!validation.valid) {
        systemMonitor.trackApiCall('/api/upload/r2', 'POST', 400, Date.now() - startTime, user.id);
        systemMonitor.increment('uploads.security_blocked');
        return NextResponse.json({
          error: validation.error,
          warnings: validation.warnings
        }, { status: 400 });
      }

      // Check user quota
      const quotaCheck = await costMonitor.checkUserQuota(user.id, 'storage', file.size);
      if (!quotaCheck.allowed) {
        systemMonitor.trackApiCall('/api/upload/r2', 'POST', 402, Date.now() - startTime, user.id);
        return NextResponse.json({
          error: 'Storage quota exceeded',
          currentUsage: quotaCheck.currentUsage,
          limit: quotaCheck.limit,
          resetDate: quotaCheck.resetDate
        }, { status: 402 });
      }

      // Estimate and deduct cost upfront
      const costEstimate = await costMonitor.estimateUploadCost(file.size, 'image', user.id);
      const { Currency } = await import('@/lib/currency/currency');
      const costAmount = Currency.fromMinor(BigInt(Math.ceil(costEstimate.total * 100)));
      const costDeducted = await costMonitor.deductFromBalance(user.id, costAmount);

      if (!costDeducted) {
        systemMonitor.trackApiCall('/api/upload/r2', 'POST', 402, Date.now() - startTime, user.id);
        return NextResponse.json({
          error: 'Insufficient balance for upload',
          estimatedCost: costEstimate
        }, { status: 402 });
      }

      // Upload via gateway (with failover)
      const uploadResult = await uploadGateway.upload(file, 'image', user.id);

      // Queue for processing
      const processingJobId = await mediaProcessingQueue.addJob({
        type: 'image',
        fileUrl: uploadResult.url || '',
        userId: user.id
      });

      // Track successful upload
      systemMonitor.trackUpload(user.id, 'image', uploadResult.provider, true, Date.now() - startTime, file.size);
      systemMonitor.trackApiCall('/api/upload/r2', 'POST', 200, Date.now() - startTime, user.id);

      return NextResponse.json(
        {
          url: uploadResult.url,
          fileName: uploadResult.assetId,
          provider: uploadResult.provider,
          processingJobId,
          estimatedCost: costEstimate,
          warnings: validation.warnings
        },
        { headers: rateLimitResult.headers }
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      systemMonitor.trackApiCall('/api/upload/r2', 'POST', 500, duration, user.id);
      systemMonitor.increment('uploads.failed');
      systemMonitor.increment('errors.total');

      console.error('Error uploading to R2:', error);

      // Refund cost on failure
      // TODO: Implement refund logic

      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withCreatorSessionValidation(request, async (session, user) => {
    try {

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json({ error: 'No file name provided' }, { status: 400 });
    }

    // Verify the file belongs to the user
    if (!fileName.startsWith(`${session.user.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: fileName,
    });

    await s3Client.send(command);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting from R2:', error);
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }
  });
}

