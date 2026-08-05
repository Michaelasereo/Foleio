import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import {
  hashSupportToken,
  setDeveloperSupportSession,
  supportExpiresAt,
} from '@/lib/developer-support/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawToken = url.searchParams.get('token')?.trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/$/, '');

  if (!rawToken) {
    return NextResponse.redirect(`${appUrl}/dashboard?support=invalid`);
  }

  const tokenHash = hashSupportToken(rawToken);
  const grant = await prisma.developerSupportGrant.findFirst({
    where: {
      tokenHash,
      status: { in: ['pending', 'active'] },
    },
    select: {
      id: true,
      creatorId: true,
      status: true,
    },
  });

  if (!grant) {
    return NextResponse.redirect(`${appUrl}/dashboard?support=invalid`);
  }

  const expiresAt = supportExpiresAt();
  await prisma.developerSupportGrant.update({
    where: { id: grant.id },
    data: {
      status: 'active',
      acceptedAt: new Date(),
      expiresAt,
    },
  });

  const response = NextResponse.redirect(`${appUrl}/dashboard?support=active`);
  setDeveloperSupportSession(response, {
    grantId: grant.id,
    creatorId: grant.creatorId,
    expiresAt,
  });
  return response;
}
