/**
 * Upload security validation and malware protection
 * Implements comprehensive file validation and security checks
 */

import { prisma } from '@foleio/database';
import { MAX_UPLOAD_SIZE_BYTES } from '@/lib/utils/constants';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface SecurityCheckResult {
  safe: boolean;
  threats?: string[];
  recommendations?: string[];
}

export class SecureUploadHandler {
  // File type validation (magic numbers, not just extensions)
  private readonly ALLOWED_VIDEO_TYPES = new Set([
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/webm',
    'video/ogg'
  ]);

  private readonly ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]);

  private readonly MAX_FILE_SIZES = {
    video: {
      FREE: MAX_UPLOAD_SIZE_BYTES,
      PRO: 2 * 1024 * 1024 * 1024, // 2GB
      ENTERPRISE: 10 * 1024 * 1024 * 1024 // 10GB
    },
    image: {
      FREE: 10 * 1024 * 1024,     // 10MB
      PRO: 50 * 1024 * 1024,      // 50MB
      ENTERPRISE: MAX_UPLOAD_SIZE_BYTES
    }
  };

  private readonly SUSPICIOUS_EXTENSIONS = new Set([
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'php', 'asp'
  ]);

  async validateFile(
    file: File,
    userId: string,
    contentType: 'video' | 'image'
  ): Promise<FileValidationResult> {
    const warnings: string[] = [];

    // 1. Basic file validation
    const basicCheck = await this.validateBasicFile(file, contentType);
    if (!basicCheck.valid) {
      return basicCheck;
    }

    // 2. User quota validation
    const quotaCheck = await this.validateUserQuota(userId, file.size, contentType);
    if (!quotaCheck.valid) {
      return quotaCheck;
    }

    // 3. Security checks
    const securityCheck = await this.performSecurityChecks(file);
    if (!securityCheck.safe) {
      return {
        valid: false,
        error: `Security threat detected: ${securityCheck.threats?.join(', ')}`
      };
    }

    // 4. Content validation (placeholder - would integrate with external services)
    const contentCheck = await this.validateContent(file, contentType);
    if (!contentCheck.valid) {
      return contentCheck;
    }

    return {
      valid: true,
      warnings: [
        ...warnings,
        ...(securityCheck.recommendations || []),
        ...(contentCheck.warnings || [])
      ]
    };
  }

  private async validateBasicFile(
    file: File,
    contentType: 'video' | 'image'
  ): Promise<FileValidationResult> {
    // Check file type
    const allowedTypes = contentType === 'video' ?
      this.ALLOWED_VIDEO_TYPES : this.ALLOWED_IMAGE_TYPES;

    if (!allowedTypes.has(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Allowed types: ${Array.from(allowedTypes).join(', ')}`
      };
    }

    // Check file size (basic limits before user-specific checks)
    const maxBasicSize = contentType === 'video' ? MAX_UPLOAD_SIZE_BYTES : 10 * 1024 * 1024; // 500MB video, 10MB image
    if (file.size > maxBasicSize) {
      return {
        valid: false,
        error: `File too large: ${this.formatBytes(file.size)}. Maximum allowed: ${this.formatBytes(maxBasicSize)}`
      };
    }

    // Check for suspicious extensions in filename
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension && this.SUSPICIOUS_EXTENSIONS.has(extension)) {
      return {
        valid: false,
        error: `Suspicious file extension: .${extension}`
      };
    }

    return { valid: true };
  }

  private async validateUserQuota(
    userId: string,
    fileSize: number,
    contentType: 'video' | 'image'
  ): Promise<FileValidationResult> {
    try {
      // Get user with their plan/tier
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { valid: false, error: 'User not found' };
      }

      // Get plan limits (default to FREE if no plan)
      const plan = ((user as any)?.plan as keyof typeof this.MAX_FILE_SIZES.video | undefined) || 'FREE';
      const maxSize = this.MAX_FILE_SIZES[contentType][plan as keyof typeof this.MAX_FILE_SIZES.video];

      if (fileSize > maxSize) {
        return {
          valid: false,
          error: `File size exceeds your ${plan} plan limit: ${this.formatBytes(fileSize)} > ${this.formatBytes(maxSize)}`
        };
      }

      // TODO: Check storage quota
      // const totalStorage = await this.calculateUserStorage(userId);
      // if (totalStorage + fileSize > user.storageLimit) {
      //   return { valid: false, error: 'Storage quota exceeded' };
      // }

      return { valid: true };
    } catch (error) {
      console.error('Error validating user quota:', error);
      return { valid: false, error: 'Failed to validate upload quota' };
    }
  }

  private async performSecurityChecks(file: File): Promise<SecurityCheckResult> {
    const threats: string[] = [];
    const recommendations: string[] = [];

    // Read file header for magic number validation
    const header = await this.readFileHeader(file, 64);

    // Basic magic number checks
    if (file.type.startsWith('video/')) {
      const isValidVideo = this.validateVideoMagicNumbers(header);
      if (!isValidVideo) {
        threats.push('Invalid video file format');
      }
    } else if (file.type.startsWith('image/')) {
      const isValidImage = this.validateImageMagicNumbers(header);
      if (!isValidImage) {
        threats.push('Invalid image file format');
      }
    }

    // Check for embedded scripts in filenames
    if (file.name.includes('<script') || file.name.includes('javascript:')) {
      threats.push('Suspicious filename with script content');
    }

    // File size anomalies
    if (file.size < 100) {
      threats.push('File suspiciously small');
    }

    // Recommendations
    if (file.size > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Large file detected - consider compression');
    }

    return {
      safe: threats.length === 0,
      threats: threats.length > 0 ? threats : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async validateContent(
    file: File,
    contentType: 'video' | 'image'
  ): Promise<FileValidationResult> {
    // Placeholder for content moderation
    // In production, this would integrate with:
    // - AWS Rekognition for image content moderation
    // - Google Video AI for video content analysis
    // - Custom ML models for NSFW detection

    console.log(`🔍 Content validation placeholder for ${contentType}: ${file.name}`);

    return {
      valid: true,
      warnings: ['Content moderation not yet implemented - manual review recommended']
    };
  }

  private async readFileHeader(file: File, bytes: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve(new Uint8Array(arrayBuffer));
      };
      reader.onerror = () => reject(new Error('Failed to read file header'));
      reader.readAsArrayBuffer(file.slice(0, bytes));
    });
  }

  private validateVideoMagicNumbers(header: Uint8Array): boolean {
    // MP4: ftyp box
    if (header.length >= 12) {
      const ftyp = String.fromCharCode(...header.slice(4, 8));
      if (ftyp === 'ftyp') return true;
    }

    // MOV: moov atom
    if (header.length >= 8) {
      const atom = String.fromCharCode(...header.slice(4, 8));
      if (atom === 'moov') return true;
    }

    // WebM: EBML header
    if (header.length >= 4 && header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) {
      return true;
    }

    return false;
  }

  private validateImageMagicNumbers(header: Uint8Array): boolean {
    // JPEG: FF D8 FF
    if (header.length >= 3 && header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
      return true;
    }

    // PNG: 89 50 4E 47
    if (header.length >= 8 && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
      return true;
    }

    // GIF: 47 49 46
    if (header.length >= 6 && header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
      return true;
    }

    // WebP: RIFF....WEBP
    if (header.length >= 12 &&
        header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
        header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
      return true;
    }

    return false;
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// Export singleton instance
export const uploadSecurity = new SecureUploadHandler();
