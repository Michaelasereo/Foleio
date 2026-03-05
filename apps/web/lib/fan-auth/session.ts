import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const FAN_SESSION_COOKIE = 'fan_session';
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

type FanSessionPayload = {
  email: string;
  verifiedAt: number;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getSessionSecret() {
  const secret = process.env.FAN_SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      'Missing FAN_SESSION_SECRET or NEXTAUTH_SECRET for fan session signing'
    );
  }
  return secret;
}

function signPayload(payload: FanSessionPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token: string): FanSessionPayload | null {
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

    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as FanSessionPayload;
    if (!parsed.email || !parsed.exp || Date.now() > parsed.exp) return null;
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
    .find((part) => part.startsWith(`${FAN_SESSION_COOKIE}=`));

  if (!cookie) return null;
  return cookie.slice(`${FAN_SESSION_COOKIE}=`.length);
}

export function getFanSession(request: NextRequest | Request) {
  const token = extractCookieValue(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return null;
  return { email: payload.email };
}

export function getFanSessionFromCookieValue(cookieValue?: string | null) {
  const payload = cookieValue ? verifyToken(cookieValue) : null;
  if (!payload) return null;
  return { email: payload.email };
}

export function setFanSession(response: NextResponse, email: string) {
  const payload: FanSessionPayload = {
    email: email.toLowerCase().trim(),
    verifiedAt: Date.now(),
    exp: Date.now() + SEVEN_DAYS_SECONDS * 1000,
  };

  response.cookies.set(FAN_SESSION_COOKIE, signPayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_SECONDS,
  });
}

export function clearFanSession(response: NextResponse) {
  response.cookies.set(FAN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
