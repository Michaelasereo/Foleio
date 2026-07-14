import { prisma } from '@foleio/database';
import { resend, resolveFromEmail } from '@/lib/email/resend';
import {
  getFoleioLogoAttachment,
  FOLEIO_LOGO_CID,
} from '@/lib/email/foleio-dark-email';
import {
  renderSignupVerificationCodeEmail,
  signupVerificationSubject,
} from '@/lib/email/templates/signup-verification-code';
import {
  inviteVerificationSubject,
  renderInviteVerificationCodeEmail,
} from '@/lib/email/templates/invite-verification-code';
import { createAdminClient } from '@/lib/supabase/admin';

const OTP_TTL_MS = 10 * 60 * 1000;

export type AuthOtpPurpose = 'signup' | 'email_verify' | 'invite';

export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export { FOLEIO_LOGO_CID };

export async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  const normalized = email.toLowerCase().trim();

  // Prefer getUserByEmail when available (supabase-js v2.49+)
  const adminAny = admin.auth.admin as typeof admin.auth.admin & {
    getUserByEmail?: (
      email: string
    ) => Promise<{ data: { user: { id: string; email?: string; email_confirmed_at?: string | null } | null }; error: Error | null }>;
  };

  if (typeof adminAny.getUserByEmail === 'function') {
    const { data, error } = await adminAny.getUserByEmail(normalized);
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  return (
    data.users.find((user) => user.email?.toLowerCase() === normalized) ?? null
  );
}

export async function createAndSendAuthOtp(
  email: string,
  purpose: AuthOtpPurpose = 'signup',
  opts?: { verifyUrl?: string }
) {
  const normalized = email.toLowerCase().trim();
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.authOTPCode.updateMany({
    where: { email: normalized, used: false, purpose },
    data: { used: true },
  });

  await prisma.authOTPCode.create({
    data: {
      email: normalized,
      code,
      purpose,
      expiresAt,
    },
  });

  const logo = await getFoleioLogoAttachment();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';
  const isInvite = purpose === 'invite';
  const verifyUrl =
    opts?.verifyUrl ||
    `${siteUrl.replace(/\/$/, '')}/invite/verify`;

  const { error } = await resend.emails.send({
    from: resolveFromEmail(),
    to: normalized,
    subject: isInvite ? inviteVerificationSubject : signupVerificationSubject,
    html: isInvite
      ? renderInviteVerificationCodeEmail({
          email: normalized,
          code,
          verifyUrl,
        })
      : renderSignupVerificationCodeEmail({
          email: normalized,
          code,
        }),
    attachments: [logo],
  });

  if (error) {
    console.error('Failed to send auth OTP via Resend:', error);
    throw new Error(error.message || 'Failed to send verification code');
  }

  return { code, expiresAt };
}

export async function consumeAuthOtp(
  email: string,
  code: string,
  purpose: AuthOtpPurpose = 'signup'
) {
  const normalized = email.toLowerCase().trim();
  const otp = await prisma.authOTPCode.findFirst({
    where: {
      email: normalized,
      code: code.trim(),
      purpose,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return false;

  await prisma.authOTPCode.update({
    where: { id: otp.id },
    data: { used: true },
  });

  return true;
}

export async function confirmAuthUserEmail(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) throw error;
}
