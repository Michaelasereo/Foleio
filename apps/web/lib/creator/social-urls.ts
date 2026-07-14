/** Normalize a social / portfolio URL. Empty → null. Adds https:// when missing. */
export function cleanSocialUrl(raw: string | null | undefined): string | null {
  const parsed = parseSocialUrl(raw);
  return parsed.ok ? parsed.url : null;
}

/**
 * Validate and normalize an optional social URL.
 * Empty is allowed (clears the field). Non-empty must be a real http(s) URL.
 */
export function parseSocialUrl(
  raw: string | null | undefined
): { ok: true; url: string | null } | { ok: false; error: string } {
  const value = raw?.trim() || '';
  if (!value) {
    return { ok: true, url: null };
  }

  // Reject bare handles — these fields expect full URLs.
  if (value.startsWith('@') || !/[./]/.test(value)) {
    return {
      ok: false,
      error: 'Enter a full URL (e.g. https://instagram.com/you)',
    };
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, error: 'URL must start with http:// or https://' };
    }

    const host = url.hostname;
    if (
      !host ||
      host === '.' ||
      (!host.includes('.') && host !== 'localhost')
    ) {
      return { ok: false, error: 'Enter a valid URL with a domain' };
    }

    // Block spaces / obvious junk that URL() can still parse oddly
    if (/\s/.test(value)) {
      return { ok: false, error: 'Enter a valid URL' };
    }

    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false, error: 'Enter a valid URL' };
  }
}

/**
 * Resolve Instagram/TikTok field for public display.
 * Accepts full URLs (preferred) or legacy @handles.
 */
export function resolveInstagramHref(raw: string | null | undefined): string | null {
  const value = raw?.trim() || '';
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.includes('.')) {
    const parsed = parseSocialUrl(value);
    return parsed.ok ? parsed.url : null;
  }
  const handle = value.replace(/^@+/, '').replace(/^instagram\.com\//i, '');
  if (!handle) return null;
  return `https://instagram.com/${handle}`;
}

export function resolveTiktokHref(raw: string | null | undefined): string | null {
  const value = raw?.trim() || '';
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.includes('.')) {
    const parsed = parseSocialUrl(value);
    return parsed.ok ? parsed.url : null;
  }
  const handle = value
    .replace(/^@+/, '')
    .replace(/^tiktok\.com\/@?/i, '');
  if (!handle) return null;
  return `https://tiktok.com/@${handle}`;
}
