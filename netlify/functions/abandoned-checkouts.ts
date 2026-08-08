/**
 * Schedule in Netlify UI: hourly.
 * Calls /api/cron/abandoned-checkouts (Bearer CRON_SECRET):
 * - 1h abandoned checkout reminder emails (bookings + shop)
 * - 24h auto-cancel of stale pending bookings/orders
 */
export default async () => {
  await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/abandoned-checkouts`,
    {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }
  );
};
