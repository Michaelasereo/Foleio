/**
 * Dojah server client — follows https://docs.dojah.io/docs/technical-reference/authentication
 * and https://docs.dojah.io/docs/technical-reference/get-verification-details
 */

export type DojahVerificationStatus =
  | 'Ongoing'
  | 'Completed'
  | 'Pending'
  | 'Failed'
  | 'Abandoned'
  | string;

export type DojahVerificationDetails = {
  status?: boolean;
  message?: string;
  reference_id?: string;
  verification_status?: DojahVerificationStatus;
  /** List API uses camelCase; included for normalization */
  verificationStatus?: DojahVerificationStatus;
  metadata?: Record<string, unknown>;
  value?: string;
  id_type?: string;
  data?: Record<string, unknown>;
  environment?: string;
  [key: string]: unknown;
};

const SANDBOX_BASE = 'https://sandbox.dojah.io';
const PRODUCTION_BASE = 'https://api.dojah.io';
const DEFAULT_TIMEOUT_MS = 12_000;

function dojahCredentials() {
  const appId =
    process.env.DOJAH_APP_ID?.trim() || process.env.NEXT_PUBLIC_DOJAH_APP_ID?.trim();
  const secretKey = process.env.DOJAH_SECRET_KEY?.trim();
  if (!appId || !secretKey) {
    throw new Error(
      'Dojah is not configured. Set DOJAH_APP_ID (or NEXT_PUBLIC_DOJAH_APP_ID) and DOJAH_SECRET_KEY.'
    );
  }
  return { appId, secretKey };
}

export function isDojahSandboxCredentials() {
  const secret = process.env.DOJAH_SECRET_KEY?.trim() || '';
  const pub = process.env.NEXT_PUBLIC_DOJAH_PUBLIC_KEY?.trim() || '';
  const base = process.env.DOJAH_BASE_URL?.trim() || '';
  return (
    secret.startsWith('test_sk_') ||
    pub.startsWith('test_pk_') ||
    base.includes('sandbox.dojah.io')
  );
}

/** Prefer explicit DOJAH_BASE_URL; otherwise sandbox unless NEXT_PUBLIC_ENV=production. */
export function dojahBaseUrls(): string[] {
  const configured = process.env.DOJAH_BASE_URL?.trim();
  if (configured) return [configured.replace(/\/+$/, '')];

  const env = process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV;
  if (env === 'production') return [PRODUCTION_BASE];
  return [SANDBOX_BASE];
}

/**
 * Dojah API list responses wrap in `entity`; get-by-reference docs show a flat
 * payload (same shape as the webhook). Accept either and normalize status keys.
 */
export function normalizeVerificationPayload(
  payload: unknown
): DojahVerificationDetails {
  if (!payload || typeof payload !== 'object') return {};

  const root = payload as Record<string, unknown>;
  const entity =
    root.entity && typeof root.entity === 'object'
      ? (root.entity as Record<string, unknown>)
      : null;

  // List-style: { entity: { data: [ {...} ] } } — take first match
  if (entity && Array.isArray(entity.data) && entity.data[0]) {
    return normalizeVerificationPayload(entity.data[0]);
  }

  const source = entity && !Array.isArray(entity.data) ? { ...root, ...entity } : root;

  const verificationStatus =
    (typeof source.verification_status === 'string' && source.verification_status) ||
    (typeof source.verificationStatus === 'string' && source.verificationStatus) ||
    undefined;

  const referenceId =
    (typeof source.reference_id === 'string' && source.reference_id) ||
    (typeof source.referenceId === 'string' && source.referenceId) ||
    undefined;

  return {
    ...(source as DojahVerificationDetails),
    verification_status: verificationStatus,
    reference_id: referenceId,
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchVerificationOnce(
  baseUrl: string,
  referenceId: string
): Promise<{
  ok: boolean;
  status: number;
  details: DojahVerificationDetails;
  raw: unknown;
  timedOut?: boolean;
}> {
  const { appId, secretKey } = dojahCredentials();
  const url = new URL(`${baseUrl}/api/v1/kyc/verification`);
  url.searchParams.set('reference_id', referenceId);

  try {
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        AppId: appId,
        Authorization: secretKey,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const raw = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      details: normalizeVerificationPayload(raw),
      raw,
    };
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === 'AbortError' || /aborted|timeout/i.test(error.message));
    return {
      ok: false,
      status: 0,
      details: {},
      raw: { error: error instanceof Error ? error.message : String(error) },
      timedOut,
    };
  }
}

/**
 * GET {{baseUrl}}/api/v1/kyc/verification?reference_id=...
 * Headers: AppId, Authorization (secret key, not Bearer)
 */
export async function getVerificationDetails(
  referenceId: string
): Promise<DojahVerificationDetails> {
  const bases = dojahBaseUrls();
  let lastError = 'Dojah verification lookup failed';
  let best: DojahVerificationDetails | null = null;
  let sawTimeout = false;

  for (const base of bases) {
    const result = await fetchVerificationOnce(base, referenceId);
    if (result.timedOut) {
      sawTimeout = true;
      lastError = `Dojah sandbox/API timed out talking to ${base}`;
      continue;
    }

    if (!result.ok) {
      const msg =
        (result.details as { message?: string }).message ||
        (result.raw as { message?: string; error?: string })?.message ||
        (result.raw as { error?: string })?.error ||
        `Dojah verification lookup failed (${result.status}) at ${base}`;
      lastError = msg;
      if (result.status === 404 || result.status === 400) continue;
      throw new Error(msg);
    }

    const details = {
      ...result.details,
      _dojahBaseUrl: base,
    } as DojahVerificationDetails;

    if (isDojahVerificationCompleted(details)) return details;
    if (
      details.verification_status ||
      details.status === true ||
      details.reference_id
    ) {
      best = details;
    }
  }

  if (best) return best;
  if (sawTimeout) {
    const err = new Error(lastError) as Error & { code?: string };
    err.code = 'DOJAH_TIMEOUT';
    throw err;
  }
  throw new Error(lastError);
}

/**
 * Poll until Completed / Failed / Abandoned, or attempts exhausted.
 * Docs: onSuccess only means the user finished the widget — status may still be Ongoing.
 */
export async function waitForVerificationDetails(
  referenceId: string,
  opts?: { attempts?: number; delayMs?: number }
): Promise<DojahVerificationDetails> {
  const attempts = opts?.attempts ?? 4;
  const delayMs = opts?.delayMs ?? 2000;
  let last: DojahVerificationDetails = {};
  let lastTimeout: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    try {
      last = await getVerificationDetails(referenceId);
      const status = String(last.verification_status || '').toLowerCase();
      if (
        status === 'completed' ||
        status === 'failed' ||
        status === 'abandoned' ||
        (last.status === true && !status)
      ) {
        return last;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error as Error & { code?: string }).code === 'DOJAH_TIMEOUT'
      ) {
        lastTimeout = error;
        continue;
      }
      throw error;
    }
  }

  if (lastTimeout && !last.verification_status) {
    throw lastTimeout;
  }

  return last;
}

/** True when Dojah reports the KYC widget verification passed. */
export function isDojahVerificationCompleted(details: DojahVerificationDetails) {
  const status = String(
    details.verification_status || details.verificationStatus || ''
  ).toLowerCase();
  if (status === 'completed') return true;
  if (
    status === 'failed' ||
    status === 'abandoned' ||
    status === 'ongoing' ||
    status === 'pending'
  ) {
    return false;
  }
  // If verification_status is omitted, fall back to boolean status from the docs sample
  return details.status === true;
}

export function extractMetadataCreatorId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const record = metadata as Record<string, unknown>;
  const nested =
    record.user_id ??
    record.creator_id ??
    (typeof record.metadata === 'object' && record.metadata
      ? (record.metadata as Record<string, unknown>).creator_id ||
        (record.metadata as Record<string, unknown>).user_id
      : null);
  if (typeof nested === 'string' && nested.trim()) return nested.trim();
  return null;
}
