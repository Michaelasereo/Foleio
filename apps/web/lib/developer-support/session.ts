import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';

export const DEVELOPER_SUPPORT_COOKIE = 'foleio_dev_support';
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

export type DeveloperSupportSession = {
  grantId: string;
  creatorId: string;
  exp: number;
};

function getSessionSecret() {
  const secret =
    process.env.DEVELOPER_SUPPORT_SESSION_SECRET ||
    process.env.FAN_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      'Missing DEVELOPER_SUPPORT_SESSION_SECRET, FAN_SESSION_SECRET, or NEXTAUTH_SECRET'
    );
  }
  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload: DeveloperSupportSession) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token: string): DeveloperSupportSession | null {
  try {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', getSessionSecret())
      .update(encodedPayload)
      .digest('base64url');

    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(actual, expected)) return null;

    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as DeveloperSupportSession;
    if (!parsed.grantId || !parsed.creatorId || !parsed.exp) return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractCookieValue(
  requestOrCookieHeader: NextRequest | Request | string | null | undefined
) {
  if (!requestOrCookieHeader) return null;
  const cookieHeader =
    typeof requestOrCookieHeader === 'string'
      ? requestOrCookieHeader
      : requestOrCookieHeader.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DEVELOPER_SUPPORT_COOKIE}=`));

  if (!cookie) return null;
  return cookie.slice(`${DEVELOPER_SUPPORT_COOKIE}=`.length);
}

export function hashSupportToken(rawToken: string) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function createSupportToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export async function getDeveloperSupportSession(
  requestOrCookies?: NextRequest | Request | Awaited<ReturnType<typeof cookies>>
) {
  let token: string | null = null;

  if (requestOrCookies && typeof (requestOrCookies as NextRequest).headers?.get === 'function') {
    token = extractCookieValue(requestOrCookies as NextRequest | Request);
  } else if (requestOrCookies) {
    token = (requestOrCookies as Awaited<ReturnType<typeof cookies>>).get(
      DEVELOPER_SUPPORT_COOKIE
    )?.value ?? null;
  } else {
    const store = await cookies();
    token = store.get(DEVELOPER_SUPPORT_COOKIE)?.value ?? null;
  }

  const payload = token ? verifyToken(token) : null;
  if (!payload) return null;

  const grant = await prisma.developerSupportGrant.findFirst({
    where: {
      id: payload.grantId,
      creatorId: payload.creatorId,
      status: 'active',
    },
    select: {
      id: true,
      creatorId: true,
      expiresAt: true,
      status: true,
    },
  });

  if (!grant) return null;
  if (grant.expiresAt && grant.expiresAt.getTime() < Date.now()) {
    await prisma.developerSupportGrant.updateMany({
      where: { id: grant.id, status: 'active' },
      data: { status: 'expired' },
    });
    return null;
  }

  return { grantId: grant.id, creatorId: grant.creatorId, exp: payload.exp };
}

export function setDeveloperSupportSession(
  response: NextResponse,
  session: { grantId: string; creatorId: string; expiresAt: Date }
) {
  const payload: DeveloperSupportSession = {
    grantId: session.grantId,
    creatorId: session.creatorId,
    exp: session.expiresAt.getTime(),
  };

  response.cookies.set(DEVELOPER_SUPPORT_COOKIE, signPayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_SECONDS,
  });
}

export function clearDeveloperSupportSession(response: NextResponse) {
  response.cookies.set(DEVELOPER_SUPPORT_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function supportExpiresAt(from = new Date()) {
  return new Date(from.getTime() + SEVEN_DAYS_SECONDS * 1000);
}
