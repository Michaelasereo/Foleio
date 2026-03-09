const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID =
  process.env.CLOUDFLARE_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY =
  process.env.CLOUDFLARE_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  throw new Error('Missing Cloudflare R2 environment variables');
}

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadToR2(
  file: File | Buffer,
  fileName: string,
  contentType?: string
): Promise<string> {
  const formData = new FormData();
  
  if (file instanceof File) {
    formData.append('file', file);
  } else {
    formData.append('file', new Blob([file as BlobPart], { type: contentType }));
  }

  formData.append('fileName', fileName);

  const response = await fetch('/api/upload/r2', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload file');
  }

  const data = await response.json();
  return data.url;
}

/**
 * Delete a file from Cloudflare R2
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  const fileName = fileUrl.split('/').pop();
  if (!fileName) {
    throw new Error('Invalid file URL');
  }

  const response = await fetch(`/api/upload/r2?fileName=${fileName}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete file');
  }
}

/**
 * Get public URL for a file
 */
export function getR2PublicUrl(fileName: string): string {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${fileName}`;
  }
  return `https://pub-${R2_ACCOUNT_ID}.r2.dev/${R2_BUCKET_NAME}/${fileName}`;
}

