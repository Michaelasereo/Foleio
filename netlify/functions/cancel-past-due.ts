export default async () => {
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/cancel-past-due`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
};
