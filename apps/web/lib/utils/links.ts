// Helper to get icon for link type
export function getLinkIcon(linkType: string): string {
  const icons: Record<string, string> = {
    instagram: 'instagram',
    tiktok: 'music-2',
    twitter: 'twitter',
    youtube: 'youtube',
    price_list: 'file-text',
    custom: 'link',
  };
  return icons[linkType] || 'link';
}

// Helper to get social media URL pattern
export function getSocialUrlPattern(linkType: string, handle: string): string {
  const patterns: Record<string, string> = {
    instagram: `https://instagram.com/${handle}`,
    tiktok: `https://tiktok.com/@${handle}`,
    twitter: `https://twitter.com/${handle}`,
    youtube: `https://youtube.com/@${handle}`,
  };
  return patterns[linkType] || handle;
}

// Common link types for UI
export const LINK_TYPES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'price_list', label: 'Services' },
  { value: 'custom', label: 'Custom Link' },
] as const;

