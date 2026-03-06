export default async () => {
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/process-payouts`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
};

