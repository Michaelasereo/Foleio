const AVATAR_UPDATED_EVENT = 'foleio:avatar-updated';
const BANNER_UPDATED_EVENT = 'foleio:banner-updated';

export function broadcastAvatarUpdated(avatarUrl: string | null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(AVATAR_UPDATED_EVENT, { detail: { avatarUrl } })
  );
}

export function subscribeAvatarUpdated(
  handler: (avatarUrl: string | null) => void
) {
  if (typeof window === 'undefined') return () => undefined;

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ avatarUrl: string | null }>).detail;
    handler(detail?.avatarUrl ?? null);
  };

  window.addEventListener(AVATAR_UPDATED_EVENT, listener);
  return () => window.removeEventListener(AVATAR_UPDATED_EVENT, listener);
}

export function broadcastBannerUpdated(bannerUrl: string | null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(BANNER_UPDATED_EVENT, { detail: { bannerUrl } })
  );
}

export function subscribeBannerUpdated(
  handler: (bannerUrl: string | null) => void
) {
  if (typeof window === 'undefined') return () => undefined;

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ bannerUrl: string | null }>).detail;
    handler(detail?.bannerUrl ?? null);
  };

  window.addEventListener(BANNER_UPDATED_EVENT, listener);
  return () => window.removeEventListener(BANNER_UPDATED_EVENT, listener);
}
