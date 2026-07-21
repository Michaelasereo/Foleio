/**
 * One-off blast: send “Understand your fees” to every creator with an email.
 *
 * Usage (from apps/web):
 *   pnpm exec tsx scripts/send-understand-your-fees.ts
 *   DRY_RUN=1 pnpm exec tsx scripts/send-understand-your-fees.ts
 */
import { prisma } from '@foleio/database';
import { sendUnderstandYourFeesEmail } from '../lib/email/send';

const SITE_URL = 'https://foleio.com';
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const DELAY_MS = Number(process.env.EMAIL_DELAY_MS || 350);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const creators = await prisma.creator.findMany({
    select: {
      id: true,
      displayName: true,
      username: true,
      user: { select: { email: true, fullName: true } },
    },
  });

  const recipients = creators
    .map((c) => {
      const email = c.user?.email?.trim().toLowerCase();
      if (!email || !email.includes('@')) return null;
      const displayName =
        c.displayName?.trim() ||
        c.user?.fullName?.split(' ')[0]?.trim() ||
        c.username ||
        'there';
      return { creatorId: c.id, email, displayName };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  // Dedupe by email
  const byEmail = new Map<string, (typeof recipients)[number]>();
  for (const r of recipients) {
    if (!byEmail.has(r.email)) byEmail.set(r.email, r);
  }
  const unique = [...byEmail.values()];

  console.log(
    `${DRY_RUN ? '[DRY RUN] ' : ''}Sending Understand your fees to ${unique.length} creators (of ${creators.length} total)`
  );

  let sent = 0;
  let failed = 0;

  for (const recipient of unique) {
    if (DRY_RUN) {
      console.log(`would_send ${recipient.displayName}`);
      sent += 1;
      continue;
    }

    const result = await sendUnderstandYourFeesEmail({
      email: recipient.email,
      displayName: recipient.displayName,
      siteUrl: SITE_URL,
      billingUrl: `${SITE_URL}/settings?tab=billing`,
    });

    if (result.success) {
      sent += 1;
      console.log(`sent ${sent}/${unique.length}`);
    } else {
      failed += 1;
      console.error(`failed ${recipient.creatorId}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(JSON.stringify({ sent, failed, total: unique.length, dryRun: DRY_RUN }));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
