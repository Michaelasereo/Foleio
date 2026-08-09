/**
 * Schedule in Netlify UI: hourly.
 * Calls /api/cron/expire-quotes (Bearer CRON_SECRET).
 */
export default async () => {
  await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/expire-quotes`,
    {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }
  );
};
