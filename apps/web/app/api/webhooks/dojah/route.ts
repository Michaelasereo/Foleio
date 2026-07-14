import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import {
  extractMetadataCreatorId,
  getVerificationDetails,
  isDojahVerificationCompleted,
} from '@/lib/dojah/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Dojah KYC Widget webhook.
 * Subscribe in dashboard to service "KYC Widget" / kyc.widget —
 * https://docs.dojah.io/dashboard-guide/integrations/developers/webhooks
 * https://docs.dojah.io/sdks/javascript-library
 *
 * Always re-fetch status via Verification Details API before approving.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const referenceId = String(
      payload.reference_id || payload.referenceId || ''
    ).trim();

    if (!referenceId) {
      return NextResponse.json({ error: 'Missing reference_id' }, { status: 400 });
    }

    // Authoritative status from Dojah API (do not trust webhook body alone)
    const details = await getVerificationDetails(referenceId);
    if (!isDojahVerificationCompleted(details)) {
      return NextResponse.json({
        received: true,
        verified: false,
        verificationStatus: details.verification_status || null,
      });
    }

    const webhookMeta = payload.metadata;
    const creatorId =
      extractMetadataCreatorId(details.metadata) ||
      extractMetadataCreatorId(webhookMeta) ||
      extractMetadataCreatorId(
        typeof webhookMeta === 'object' && webhookMeta
          ? (webhookMeta as Record<string, unknown>)
          : null
      );

    let creator =
      creatorId != null
        ? await prisma.creator.findFirst({
            where: {
              OR: [{ id: creatorId }, { userId: creatorId }],
            },
            select: { id: true, bvnVerified: true },
          })
        : null;

    // Fallback: reference we generated as foleio_<creatorId>_...
    if (!creator && referenceId.startsWith('foleio_')) {
      const parts = referenceId.split('_');
      const maybeId = parts[1];
      if (maybeId) {
        creator = await prisma.creator.findUnique({
          where: { id: maybeId },
          select: { id: true, bvnVerified: true },
        });
      }
    }

    if (!creator) {
      console.warn('[webhooks/dojah] completed verification with no matching creator', {
        referenceId,
      });
      return NextResponse.json({
        received: true,
        verified: false,
        error: 'Creator not found for verification metadata',
      });
    }

    if (!creator.bvnVerified) {
      await prisma.creator.update({
        where: { id: creator.id },
        data: {
          bvnVerified: true,
          identityVerifiedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      received: true,
      verified: true,
      creatorId: creator.id,
      verificationStatus: details.verification_status || 'Completed',
    });
  } catch (error: unknown) {
    console.error('[webhooks/dojah]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 500 }
    );
  }
}
