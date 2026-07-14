import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';

const COOKIE_SESSION = 'admin_session';
const COOKIE_PRE_2FA = 'admin_pre_2fa';
const COOKIE_TOTP_PENDING = 'admin_totp_pending';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const PRE_2FA_MAX_AGE = 5 * 60;
const TOTP_PENDING_MAX_AGE = 10 * 60;

function sessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    'dev-admin-session-secret-change-me'
  );
}

function encryptionKey(): Buffer {
  const raw =
    process.env.ADMIN_TOTP_ENCRYPTION_KEY?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    'dev-admin-totp-key-change-me';
  return createHash('sha256').update(raw).digest();
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivB64, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}

type SessionPayload = {
  adminId: string;
  v: number;
  exp: number;
  kind: 'session' | 'pre2fa';
};

function signPayload(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySigned(token: string, kind: SessionPayload['kind']): SessionPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (payload.kind !== kind) return null;
    if (!payload.adminId || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createAdminSessionToken(adminId: string): string {
  return signPayload({
    adminId,
    v: 1,
    kind: 'session',
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });
}

export function createAdminPre2faToken(adminId: string): string {
  return signPayload({
    adminId,
    v: 1,
    kind: 'pre2fa',
    exp: Date.now() + PRE_2FA_MAX_AGE * 1000,
  });
}

export function readAdminSessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null;
  return verifySigned(token, 'session');
}

export function readAdminPre2faToken(token?: string | null): SessionPayload | null {
  if (!token) return null;
  return verifySigned(token, 'pre2fa');
}

function cookieAttrs(maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict${secure}`;
}

export function setAdminSessionCookieHeader(token: string): string {
  return `${COOKIE_SESSION}=${token}; ${cookieAttrs(SESSION_MAX_AGE)}`;
}

export function setAdminPre2faCookieHeader(token: string): string {
  return `${COOKIE_PRE_2FA}=${token}; ${cookieAttrs(PRE_2FA_MAX_AGE)}`;
}

export function clearAdminSessionCookieHeader(): string {
  return `${COOKIE_SESSION}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`;
}

export function clearAdminPre2faCookieHeader(): string {
  return `${COOKIE_PRE_2FA}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`;
}

export function setAdminTotpPendingCookieHeader(secretEnc: string): string {
  return `${COOKIE_TOTP_PENDING}=${encodeURIComponent(secretEnc)}; ${cookieAttrs(TOTP_PENDING_MAX_AGE)}`;
}

export function clearAdminTotpPendingCookieHeader(): string {
  return `${COOKIE_TOTP_PENDING}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`;
}

export function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export const ADMIN_COOKIE = {
  session: COOKIE_SESSION,
  pre2fa: COOKIE_PRE_2FA,
  totpPending: COOKIE_TOTP_PENDING,
} as const;

export const SEEDED_ADMIN_EMAIL = 'michaelasereo@gmail.com';
export const SEEDED_ADMIN_PASSWORD = 'password123';
