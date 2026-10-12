import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { z } from 'zod';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';
import { sendDeveloperSupportInviteEmail } from '@/lib/email/send';
import {
  createSupportToken,
  hashSupportToken,
} from '@/lib/developer-support/session';
import { toWhatsAppDigits, whatsappChatUrl } from '@/lib/quotes/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildWhatsappUrl(creatorName: string, creatorUsername: string) {
  const phone = (process.env.FOLEIO_SUPPORT_WHATSAPP || '2348141294589').replace(/\D/g, '');
  const message = encodeURIComponent(
    `Hi Foleio — I requested developer setup help for ${creatorName} (@${creatorUsername}).`
  );
  return `https://wa.me/${phone}?text=${message}`;
}

const requestSchema = z.object({
  merchantWhatsappPhone: z.string().trim().min(5).max(32),
  supportNote: z.string().trim().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const auth = await assertCreatorApiAccess(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.access.mode === 'support') {
      return NextResponse.json(
        { error: 'Only the account owner can request developer support.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const merchantWhatsappPhone =
      toWhatsAppDigits(parsed.data.merchantWhatsappPhone) || null;
    if (!merchantWhatsappPhone) {
      return NextResponse.json(
        { error: 'Enter a valid WhatsApp number' },
        { status: 400 }
      );
    }
    const supportNote = parsed.data.supportNote?.trim() || null;

    const { creator } = auth.access;
    const creatorProfile = await prisma.creator.findUnique({
      where: { id: creator.id },
      select: { displayName: true, username: true, user: { select: { email: true } } },
    });
    if (!creatorProfile) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    await prisma.developerSupportGrant.updateMany({
      where: {
        creatorId: creator.id,
        status: { in: ['pending', 'active'] },
      },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
      },
    });

    const rawToken = createSupportToken();
    const tokenHash = hashSupportToken(rawToken);
    const inviteEmail =
      process.env.FOLEIO_DEVELOPER_SUPPORT_EMAIL || 'asereopeyemimichael@gmail.com';
    const appUrl = new URL(request.url).origin.replace(/\/$/, '');
    const acceptUrl = `${appUrl}/support/accept?token=${encodeURIComponent(rawToken)}`;

    await prisma.developerSupportGrant.create({
      data: {
        creatorId: creator.id,
        tokenHash,
        status: 'pending',
        invitedEmail: inviteEmail,
      },
    });

    await sendDeveloperSupportInviteEmail({
      to: inviteEmail,
      creatorName: creatorProfile.displayName,
      creatorUsername: creatorProfile.username,
      acceptUrl,
      merchantWhatsappPhone,
      supportNote,
      merchantEmail: creatorProfile.user?.email || null,
    });

    return NextResponse.json({
      whatsappUrl: buildWhatsappUrl(creatorProfile.displayName, creatorProfile.username),
      merchantWhatsappPhone,
      status: 'pending',
    });
  } catch (error) {
    console.error('[creator/developer-support/request][POST] failed:', error);
    return NextResponse.json({ error: 'Failed to request developer support' }, { status: 500 });
  }
}
