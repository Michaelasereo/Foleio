import { prisma } from '@foleio/database';
import { sendEmail } from './resend';
import {
  nudge1_incomplete_onboarding,
  nudge2_no_content,
  nudge3_no_subscribers,
} from './templates/nudges';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendOnboardingNudges() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Nudge 1: Signed up 24h ago, no creator profile yet
  const usersWithoutCreator = await prisma.user.findMany({
    where: {
      createdAt: { lte: oneDayAgo },
      creatorProfile: { is: null },
    },
    take: 50,
  });

  for (const user of usersWithoutCreator) {
    const alreadySent = await prisma.nudgeLog.findFirst({
      where: { userId: user.id, nudgeType: 'onboarding_incomplete' },
    });
    if (alreadySent) continue;

    const { subject, html } = nudge1_incomplete_onboarding({
      name: user.fullName?.split(' ')[0] || 'there',
      onboardingUrl: `${APP_URL}/onboard`,
    });

    const sent = await sendEmail({ to: user.email, subject, html });
    if (!sent.success) continue;

    await prisma.nudgeLog.create({
      data: { userId: user.id, nudgeType: 'onboarding_incomplete' },
    });
  }

  // Nudge 2: Onboarded 3 days ago, zero content
  const creatorsNoContent = await prisma.creator.findMany({
    where: {
      createdAt: { lte: threeDaysAgo },
      contentCount: 0,
    },
    include: { user: true },
    take: 50,
  });

  for (const creator of creatorsNoContent) {
    const alreadySent = await prisma.nudgeLog.findFirst({
      where: { userId: creator.userId, nudgeType: 'no_content' },
    });
    if (alreadySent) continue;

    const { subject, html } = nudge2_no_content({
      name: creator.displayName?.split(' ')[0] || 'there',
      uploadUrl: `${APP_URL}/content/new`,
    });

    const sent = await sendEmail({ to: creator.user.email, subject, html });
    if (!sent.success) continue;

    await prisma.nudgeLog.create({
      data: { userId: creator.userId, nudgeType: 'no_content' },
    });
  }

  // Nudge 3: Has content for 7 days, zero subscribers
  const creatorsNoSubscribers = await prisma.creator.findMany({
    where: {
      createdAt: { lte: sevenDaysAgo },
      subscriberCount: 0,
      contentCount: { gt: 0 },
    },
    include: { user: true },
    take: 50,
  });

  for (const creator of creatorsNoSubscribers) {
    const alreadySent = await prisma.nudgeLog.findFirst({
      where: { userId: creator.userId, nudgeType: 'no_subscribers' },
    });
    if (alreadySent) continue;

    const { subject, html } = nudge3_no_subscribers({
      name: creator.displayName?.split(' ')[0] || 'there',
      profileUrl: `${APP_URL}/creator/${creator.username}`,
      tipsUrl: `${APP_URL}/creators`,
    });

    const sent = await sendEmail({ to: creator.user.email, subject, html });
    if (!sent.success) continue;

    await prisma.nudgeLog.create({
      data: { userId: creator.userId, nudgeType: 'no_subscribers' },
    });
  }
}
