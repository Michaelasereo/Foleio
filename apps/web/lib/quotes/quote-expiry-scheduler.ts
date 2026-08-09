import { prisma } from '@foleio/database';

const BATCH_SIZE = 100;

/**
 * Mark sent/accepted quotes past validUntil as expired.
 */
export async function processQuoteExpiry(now: Date = new Date()) {
  let expired = 0;
  let cursor: string | undefined;

  for (;;) {
    const batch = await prisma.quote.findMany({
      where: {
        status: { in: ['sent', 'accepted'] },
        validUntil: { lt: now },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      select: { id: true },
    });

    if (batch.length === 0) break;

    const result = await prisma.quote.updateMany({
      where: { id: { in: batch.map((q) => q.id) } },
      data: { status: 'expired' },
    });
    expired += result.count;
    cursor = batch[batch.length - 1]?.id;
    if (batch.length < BATCH_SIZE) break;
  }

  return { expired };
}
