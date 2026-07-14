import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import {
  extractMetadataCreatorId,
  isDojahSandboxCredentials,
  isDojahVerificationCompleted,
  normalizeVerificationPayload,
  waitForVerificationDetails,
  type DojahVerificationDetails,
} from '@/lib/dojah/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * After the Dojah widget finishes, confirm status via the Verification Details API.
 * Docs: never rely on SDK onSuccess alone —
 * https://docs.dojah.io/docs/technical-reference/get-verification-details
 *
 * Sandbox note: Dojah's sandbox Verification Details host often times out with
 * valid test keys. If the API is unreachable and the widget onSuccess payload
 * already includes verification_status=Completed, we accept that for sandbox only.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json()) as {
      referenceId?: string;
      reference_id?: string;
      widget?: unknown;
    };
    const referenceId = String(body.referenceId || body.reference_id || '').trim();
    if (!referenceId || referenceId.length <= 10) {
      return NextResponse.json(
        {
          error:
            'A valid Dojah reference_id is required (length must be greater than 10)',
        },
        { status: 400 }
      );
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true, bvnVerified: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    if (creator.bvnVerified) {
      return NextResponse.json({
        verified: true,
        alreadyVerified: true,
        verificationStatus: 'Completed',
      });
    }

    const widgetDetails = normalizeVerificationPayload(body.widget);
    let details: DojahVerificationDetails = {};
    let apiTimedOut = false;

    try {
      details = await waitForVerificationDetails(referenceId, {
        attempts: 3,
        delayMs: 1500,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error as Error & { code?: string }).code === 'DOJAH_TIMEOUT'
      ) {
        apiTimedOut = true;
        console.warn('[kyc/confirm] Dojah API timeout', error.message);
      } else {
        throw error;
      }
    }

    console.info('[kyc/confirm] dojah status', {
      referenceId,
      verification_status: details.verification_status || null,
      status: details.status ?? null,
      base: details._dojahBaseUrl || null,
      apiTimedOut,
      widget_status: widgetDetails.verification_status || null,
    });

    const metadataOwner =
      extractMetadataCreatorId(details.metadata) ||
      extractMetadataCreatorId(widgetDetails.metadata);

    if (metadataOwner && metadataOwner !== creator.id && metadataOwner !== user.id) {
      return NextResponse.json(
        { error: 'Verification does not belong to this account' },
        { status: 403 }
      );
    }

    let completed = isDojahVerificationCompleted(details);
    let acceptedViaWidgetFallback = false;

    // Sandbox-only fallback when Verification Details API is unreachable.
    // Prefer verification_status=Completed; if Dojah omits it, accept status:true.
    if (!completed && apiTimedOut && isDojahSandboxCredentials()) {
      const widgetStatus = String(widgetDetails.verification_status || '').toLowerCase();
      const rejected =
        widgetStatus === 'failed' ||
        widgetStatus === 'abandoned' ||
        widgetStatus === 'pending';
      const widgetPassed =
        !rejected &&
        (widgetStatus === 'completed' || widgetDetails.status === true);

      if (widgetPassed) {
        completed = true;
        acceptedViaWidgetFallback = true;
        details = {
          ...widgetDetails,
          reference_id: widgetDetails.reference_id || referenceId,
          verification_status: 'Completed',
        };
      }
    }

    if (!completed) {
      const statusLabel = details.verification_status || (apiTimedOut ? 'timeout' : 'unknown');
      return NextResponse.json(
        {
          verified: false,
          verificationStatus: details.verification_status || null,
          message: apiTimedOut
            ? 'Dojah sandbox API timed out while confirming. Open the Dojah dashboard → EasyOnboard → Verifications. If that row shows Completed, finish the widget again (we need verification_status=Completed in onSuccess), or retry in a minute.'
            : statusLabel === 'Pending'
              ? 'Dojah marked this verification as Pending (manual review). Check EasyOnboard / verifications in the Dojah dashboard.'
              : statusLabel === 'Ongoing'
                ? 'Dojah is still processing. Wait a few seconds and try Verify identity again.'
                : statusLabel === 'Failed'
                  ? 'Identity verification failed in Dojah. Start a new verification.'
                  : statusLabel === 'Abandoned'
                    ? 'Verification was abandoned. Start a new verification.'
                    : `Identity verification is not complete yet (status: ${statusLabel}).`,
        },
        { status: 400 }
      );
    }

    await prisma.creator.update({
      where: { id: creator.id },
      data: {
        bvnVerified: true,
        identityVerifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      verified: true,
      verificationStatus: details.verification_status || 'Completed',
      referenceId: details.reference_id || referenceId,
      sandboxWidgetFallback: acceptedViaWidgetFallback || undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'KYC confirmation failed';
    console.error('[kyc/confirm]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
