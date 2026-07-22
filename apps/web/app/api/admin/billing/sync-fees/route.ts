import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import { syncCreatorSubaccountFee } from '@/lib/billing/platform-fee';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Push each creator's current platform fee % to their Paystack subaccount.
 * Fixes stale percentage_charge values (e.g. legacy 5% / 95% split).
 * Paystack dashboard "Split" is the creator share ≈ 100 − percentage_charge.
 */
export async function POST(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creators = await prisma.creator.findMany({
    where: { paystackSubaccountCode: { not: null } },
    select: { id: true, username: true, paystackSubaccountCode: true },
  });

  const results: Array<{
    creatorId: string;
    username: string | null;
    updated: boolean;
    percentageCharge: number;
    previousPercentageCharge: number | null;
    verifiedPercentageCharge: number | null;
    creatorSplitPercent: number | null;
    error?: string;
  }> = [];

  let updated = 0;
  let failed = 0;
  let unchanged = 0;

  for (const creator of creators) {
    try {
      const result = await syncCreatorSubaccountFee(creator.id);
      if (result.updated) updated += 1;
      else unchanged += 1;
      results.push({
        creatorId: creator.id,
        username: creator.username,
        updated: result.updated,
        percentageCharge: result.percentageCharge,
        previousPercentageCharge: result.previousPercentageCharge,
        verifiedPercentageCharge: result.verifiedPercentageCharge,
        creatorSplitPercent:
          result.verifiedPercentageCharge != null
            ? Math.round((100 - result.verifiedPercentageCharge) * 10) / 10
            : null,
      });
    } catch (error) {
      failed += 1;
      results.push({
        creatorId: creator.id,
        username: creator.username,
        updated: false,
        percentageCharge: 0,
        previousPercentageCharge: null,
        verifiedPercentageCharge: null,
        creatorSplitPercent: null,
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  }

  return Response.json({
    total: creators.length,
    updated,
    unchanged,
    failed,
    /** Hint for matching Paystack dashboard Split column */
    note: 'Paystack Split ≈ 100 − fee%. Free should be ~96.5%, Pro ~98.2%.',
    results,
  });
}
