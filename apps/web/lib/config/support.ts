/** Public support inbox for Foleio creators. */
export const FOLEIO_SUPPORT_EMAIL = 'michaelasereo@gmail.com';

/**
 * Ops inbox that receives a sample copy of customer booking/order confirmation emails.
 * Override with FOLEIO_ADMIN_OPS_EMAIL in production if needed.
 */
export const FOLEIO_ADMIN_OPS_EMAIL =
  process.env.FOLEIO_ADMIN_OPS_EMAIL?.trim() || 'michaelasereo@gmail.com';
