import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';
import { decryptSecret, encryptSecret } from '@/lib/admin/crypto';

export function generateTotpSecret() {
  const secret = new Secret({ size: 20 });
  return secret.base32;
}

export function buildTotp(email: string, secretBase32: string) {
  return new TOTP({
    issuer: 'Foleio Admin',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

export async function createTotpSetup(email: string) {
  const secretBase32 = generateTotpSecret();
  const totp = buildTotp(email, secretBase32);
  const otpauth = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(otpauth, {
    margin: 1,
    width: 220,
    color: { dark: '#111111', light: '#ffffff' },
  });
  return {
    secretBase32,
    secretEnc: encryptSecret(secretBase32),
    otpauth,
    qrDataUrl,
  };
}

export function verifyTotpCode(secretBase32: string, token: string): boolean {
  const totp = buildTotp('verify', secretBase32);
  const delta = totp.validate({ token: token.replace(/\s/g, ''), window: 1 });
  return delta !== null;
}

export function verifyEncryptedTotp(secretEnc: string, token: string): boolean {
  const secretBase32 = decryptSecret(secretEnc);
  return verifyTotpCode(secretBase32, token);
}
