const BLOCKED_PAGE_PREFIXES = [
  '/earnings',
  '/payouts',
  '/analytics',
  '/billing',
] as const;

const BLOCKED_API_PREFIXES = [
  '/api/creator/earnings',
  '/api/creator/payouts',
  '/api/creator/bank',
  '/api/creator/analytics',
  '/api/billing',
  '/api/auth',
] as const;

export function isDeveloperSupportBlockedPage(pathname: string, search = '') {
  if (BLOCKED_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const tab = params.get('tab');
    if (tab === 'billing') return true;
  }

  return false;
}

export function isDeveloperSupportBlockedApi(pathname: string) {
  return BLOCKED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function developerSupportBlockedMessage() {
  return 'This area is unavailable in developer support mode.';
}
