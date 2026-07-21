export type BookingPolicyDocumentFields = {
  bookingPolicyType?: string | null;
  bookingPolicyFileUrl?: string | null;
  bookingPolicyFileName?: string | null;
  bookingPolicyLinkUrl?: string | null;
};

export function isAllowedBookingPolicyLink(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return (
      host === 'docs.google.com' ||
      host === 'drive.google.com' ||
      host.endsWith('.docs.google.com') ||
      host.endsWith('.drive.google.com')
    );
  } catch {
    return false;
  }
}

/** Single policy href — file or link, never both. */
export function resolveBookingPolicyHref(
  policy: BookingPolicyDocumentFields
): string | null {
  if (policy.bookingPolicyType === 'file' && policy.bookingPolicyFileUrl) {
    return policy.bookingPolicyFileUrl;
  }
  if (policy.bookingPolicyType === 'link' && policy.bookingPolicyLinkUrl) {
    return policy.bookingPolicyLinkUrl;
  }
  // Fallback if type is missing but a URL exists
  if (policy.bookingPolicyFileUrl) return policy.bookingPolicyFileUrl;
  if (policy.bookingPolicyLinkUrl) return policy.bookingPolicyLinkUrl;
  return null;
}
