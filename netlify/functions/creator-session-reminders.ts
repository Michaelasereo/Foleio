/**
 * Schedule in Netlify UI: daily ~08:00 WAT (07:00 UTC).
 * Calls the Next.js cron route that emails creators one day before sessions.
 */
export default async () => {
  await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/creator-session-reminders`,
    {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }
  );
};
