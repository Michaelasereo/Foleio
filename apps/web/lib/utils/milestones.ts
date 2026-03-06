import { prisma } from '@foleio/database';

export type Milestone =
  | 'first_content'
  | 'first_subscriber'
  | 'first_booking'
  | 'ten_subscribers'
  | 'earned_10k';

export const MILESTONE_LABELS: Record<Milestone, string> = {
  first_content: 'Published your first content',
  first_subscriber: 'Got your first subscriber',
  first_booking: 'Completed your first booking',
  ten_subscribers: 'Reached 10 subscribers',
  earned_10k: 'Earned ₦10,000 on Foleio',
};

export const MILESTONE_EMOJIS: Record<Milestone, string> = {
  first_content: '🎬',
  first_subscriber: '🧡',
  first_booking: '📅',
  ten_subscribers: '🎉',
  earned_10k: '💰',
};

export async function checkAndLogMilestone(
  creatorId: string,
  milestone: Milestone
): Promise<boolean> {
  try {
    await prisma.milestoneLog.create({
      data: { creatorId, milestone },
    });
    return true;
  } catch {
    return false;
  }
}

export async function checkEarned10kMilestone(creatorId: string): Promise<boolean> {
  const totalEarned = await prisma.transaction.aggregate({
    where: { creatorId, status: 'success' },
    _sum: { creatorEarnings: true },
  });

  const earnings = totalEarned._sum.creatorEarnings;
  if (earnings === null || earnings === undefined) return false;

  const earningsBigInt =
    typeof earnings === 'bigint' ? earnings : BigInt(Math.trunc(Number(earnings)));

  if (earningsBigInt >= 1_000_000n) {
    return checkAndLogMilestone(creatorId, 'earned_10k');
  }

  return false;
}
