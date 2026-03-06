// Mux API service using direct HTTP calls to avoid dependency issues
const MUX_API_BASE = 'https://api.mux.com';
const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID!;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET!;

export interface MuxUploadResult {
  assetId: string;
  playbackId: string;
  uploadUrl: string;
  uploadId: string;
}

export interface MuxAssetInfo {
  assetId: string;
  playbackId: string;
  status: string;
  duration?: number;
  aspectRatio?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export class MuxService {
  private static getAuthHeaders() {
    const credentials = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a direct upload URL for a video file
   */
  static async createDirectUpload(): Promise<MuxUploadResult> {
    try {
      const response = await fetch(`${MUX_API_BASE}/video/v1/uploads`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          cors_origin: process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com',
          new_asset_settings: {
            playback_policy: ['public'],
            mp4_support: 'standard',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Mux API error: ${response.status}`);
      }

      const upload = await response.json();

      return {
        assetId: upload.data?.asset_id || '',
        playbackId: upload.data?.playback_id || '',
        uploadUrl: upload.data?.url || '',
        uploadId: upload.data?.id || '',
      };
    } catch (error) {
      console.error('Error creating Mux direct upload:', error);
      throw new Error('Failed to create video upload URL');
    }
  }

  /**
   * Get asset information by asset ID
   */
  static async getAsset(assetId: string): Promise<MuxAssetInfo | null> {
    try {
      const response = await fetch(`${MUX_API_BASE}/video/v1/assets/${assetId}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const { data: asset } = await response.json();

      return {
        assetId: asset.id,
        playbackId: asset.playback_ids?.[0]?.id || '',
        status: asset.status || 'unknown',
        duration: asset.duration,
        aspectRatio: asset.aspect_ratio,
        thumbnailUrl: asset.playback_ids?.[0]?.policy === 'public'
          ? `https://image.mux.com/${asset.playback_ids[0].id}/thumbnail.jpg`
          : undefined,
        createdAt: asset.created_at || '',
      };
    } catch (error) {
      console.error('Error retrieving Mux asset:', error);
      return null;
    }
  }

  /**
   * Delete an asset from Mux
   */
  static async deleteAsset(assetId: string): Promise<boolean> {
    try {
      const response = await fetch(`${MUX_API_BASE}/video/v1/assets/${assetId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting Mux asset:', error);
      return false;
    }
  }

  /**
   * Get upload status
   */
  static async getUploadStatus(uploadId: string) {
    try {
      const response = await fetch(`${MUX_API_BASE}/video/v1/uploads/${uploadId}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const { data: upload } = await response.json();

      return {
        id: upload.id,
        status: upload.status || 'unknown',
        assetId: upload.asset_id,
        error: upload.error,
      };
    } catch (error) {
      console.error('Error retrieving upload status:', error);
      return null;
    }
  }
}

export default MuxService;
