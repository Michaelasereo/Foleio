const MAX_SERVICE_PHOTOS = 3;

export function serviceGalleryUrls(value?: string | null): string[] {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(0, MAX_SERVICE_PHOTOS);
    } catch {
      return [];
    }
  }
  return [trimmed];
}

export function serviceCoverUrl(value?: string | null): string | null {
  return serviceGalleryUrls(value)[0] || null;
}

export function serializeServiceGallery(urls: string[]): string | null {
  const clean = urls.map((url) => url.trim()).filter(Boolean).slice(0, MAX_SERVICE_PHOTOS);
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
}
