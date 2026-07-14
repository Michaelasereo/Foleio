import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

/**
 * Kept for password-recovery / legacy magic-link redirects.
 * Signup confirmation uses Resend OTP via /api/auth/verify-email-otp (not Supabase templates).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const nextParam = url.searchParams.get('next');
  const origin = `${url.protocol}//${url.host}`;

  const supabase = await createRouteHandlerClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink',
    });
  }

  const targetPath =
    type === 'recovery'
      ? '/reset-password'
      : nextParam && nextParam.startsWith('/')
        ? nextParam
        : '/onboard';
  const target = `${origin}${targetPath}`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting…</title>
  </head>
  <body style="margin:0;background:#1a1816;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;">
    <img src="/brand/foleio-wordmark-white.svg" alt="Foleio" style="height:28px;width:auto;margin-bottom:24px;" />
    <div style="width:28px;height:28px;border:2px solid rgba(255,255,255,0.12);border-top-color:#fafafa;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
    <p style="margin-top:16px;font-size:14px;color:#adadad;">Confirming your session…</p>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    <script>
      setTimeout(function () {
        window.location.replace(${JSON.stringify(target)});
      }, 250);
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
