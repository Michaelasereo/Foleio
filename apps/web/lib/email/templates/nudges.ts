function baseTemplate(content: string): string {
  return `
    <div style="background:#F5F0E8;padding:40px 20px;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#fff;
        border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);">
        <div style="background:#F97316;padding:24px 32px;">
          <h1 style="color:#fff;margin:0;font-size:28px;
            letter-spacing:-0.5px;">Foleio</h1>
        </div>
        <div style="padding:32px;">
          ${content}
        </div>
        <div style="padding:20px 32px;border-top:1px solid #F5F0E8;
          text-align:center;">
          <p style="color:#999;font-size:12px;margin:0;">
            Foleio · noreply@foleio.com ·
            <a href="{{unsubscribe}}" style="color:#999;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

export function nudge1_incomplete_onboarding({
  name,
  onboardingUrl,
}: {
  name: string;
  onboardingUrl: string;
}) {
  const subject = "You're almost set up on Foleio 🧡";
  const html = baseTemplate(`
    <p style="font-size:16px;color:#222;margin:0 0 14px;">Hey ${name},</p>
    <p style="font-size:15px;color:#333;margin:0 0 12px;">
      You started setting up your Foleio creator profile but didn&apos;t finish.
    </p>
    <p style="font-size:15px;color:#333;margin:0 0 22px;">
      It takes less than 5 minutes - and once you&apos;re done, you can start
      earning from your content, bookings, and fan subscriptions.
    </p>
    <a href="${onboardingUrl}" style="display:inline-block;background:#F97316;color:#fff;
      text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:600;">
      Finish My Setup
    </a>
    <p style="font-size:14px;color:#666;margin:20px 0 0;">
      Need help? Just reply to this email.
    </p>
  `);

  return { subject, html };
}

export function nudge2_no_content({
  name,
  uploadUrl,
}: {
  name: string;
  uploadUrl: string;
}) {
  const subject = 'Your Foleio profile is ready — now add your first content';
  const html = baseTemplate(`
    <p style="font-size:16px;color:#222;margin:0 0 14px;">Hey ${name}, your Foleio profile is live!</p>
    <p style="font-size:15px;color:#333;margin:0 0 12px;">
      The next step is uploading your first piece of content - a video, tutorial, PDF, or image.
    </p>
    <p style="font-size:15px;color:#333;margin:0 0 22px;">
      Creators who upload content in their first week get 3x more subscribers in their first month.
    </p>
    <a href="${uploadUrl}" style="display:inline-block;background:#F97316;color:#fff;
      text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:600;">
      Upload My First Content
    </a>
    <div style="margin-top:20px;background:#FFF5EB;border:1px solid #FCD9BD;
      border-radius:10px;padding:12px 14px;">
      <p style="font-size:14px;color:#7A3E0E;margin:0;">
        💡 Tip: Start with a free piece of content to attract your first subscribers,
        then add a paid tutorial.
      </p>
    </div>
  `);

  return { subject, html };
}

export function nudge3_no_subscribers({
  name,
  profileUrl,
  tipsUrl,
}: {
  name: string;
  profileUrl: string;
  tipsUrl: string;
}) {
  const subject = 'Your first subscriber is closer than you think';
  const html = baseTemplate(`
    <p style="font-size:16px;color:#222;margin:0 0 14px;">Hey ${name},</p>
    <p style="font-size:15px;color:#333;margin:0 0 14px;">
      You&apos;ve uploaded content - great start! Now it&apos;s time to get your first subscriber.
    </p>
    <ul style="padding-left:18px;margin:0 0 20px;color:#333;font-size:15px;line-height:1.7;">
      <li>Share your Foleio link in your Instagram/TikTok bio</li>
      <li>Post about your Foleio page on your stories</li>
      <li>Offer a free content piece to draw people in</li>
    </ul>
    <a href="${profileUrl}" style="display:inline-block;background:#F97316;color:#fff;
      text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:600;">
      View My Public Profile
    </a>
    <p style="margin:14px 0 0;">
      <a href="${tipsUrl}" style="color:#F97316;text-decoration:none;font-weight:600;">
        See creator tips →
      </a>
    </p>
  `);

  return { subject, html };
}

export function nudge4_payment_failed({
  name,
  updateUrl,
  creatorName,
}: {
  name: string;
  updateUrl: string;
  creatorName: string;
}) {
  const subject = 'Action needed — update your payment method';
  const html = baseTemplate(`
    <p style="font-size:16px;color:#222;margin:0 0 14px;">Hey ${name},</p>
    <p style="font-size:15px;color:#333;margin:0 0 12px;">
      Your subscription to ${creatorName} on Foleio couldn&apos;t be renewed - your payment didn&apos;t go through.
    </p>
    <p style="font-size:15px;color:#333;margin:0 0 20px;">
      Update your payment method to keep your access.
    </p>
    <a href="${updateUrl}" style="display:inline-block;background:#F97316;color:#fff;
      text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:600;">
      Update Payment Method
    </a>
    <p style="font-size:14px;color:#666;margin:20px 0 0;">
      If you don&apos;t update within 7 days, your subscription will be cancelled automatically.
    </p>
  `);

  return { subject, html };
}

export function paymentFailedTemplate({
  fanName,
  creatorName,
  planName,
  updateUrl,
  creatorUrl,
}: {
  fanName: string;
  creatorName: string;
  planName: string;
  updateUrl: string;
  creatorUrl: string;
}): string {
  return baseTemplate(`
    <h2 style="font-family:serif;font-size:22px;
      color:#1C1008;margin:0 0 16px;">
      Your subscription needs attention 💳
    </h2>
    <p style="color:#555;line-height:1.7;margin:0 0 16px;">
      Hey ${fanName},
    </p>
    <p style="color:#555;line-height:1.7;margin:0 0 16px;">
      We couldn't renew your <strong>${planName}</strong> subscription
      to <strong>${creatorName}</strong> - your payment didn't go through.
    </p>
    <div style="background:#FFF7ED;border-left:4px solid #F97316;
      padding:16px;border-radius:0 8px 8px 0;margin:0 0 24px;">
      <p style="margin:0;color:#92400E;font-size:14px;">
        ⚠️ You have <strong>7 days</strong> to update your payment method
        before your subscription is cancelled.
      </p>
    </div>
    <a href="${updateUrl}"
      style="display:inline-block;background:#F97316;color:#fff;
        padding:14px 28px;border-radius:8px;text-decoration:none;
        font-weight:600;font-size:15px;margin-bottom:24px;">
      Update Payment Method
    </a>
    <p style="color:#555;line-height:1.7;margin:0 0 8px;">
      Or visit
      <a href="${creatorUrl}" style="color:#F97316;">
        ${creatorName}'s Foleio page
      </a>
      to resubscribe after updating.
    </p>
    <p style="color:#999;font-size:13px;margin:0;">
      If you meant to cancel, no action is needed -
      your subscription will end automatically.
    </p>
  `);
}

export function payoutConfirmationTemplate({
  name,
  amount,
  bankName,
  accountNumber,
  reference,
}: {
  name: string;
  amount: string;
  bankName: string;
  accountNumber: string;
  reference: string;
}): string {
  return baseTemplate(`
    <h2 style="font-family:serif;font-size:22px;
      color:#1C1008;margin:0 0 8px;">
      Your payout is on the way!
    </h2>
    <p style="color:#555;margin:0 0 24px;">
      Hey ${name}, your withdrawal has been processed.
    </p>
    <div style="background:#F0FDF4;border-radius:12px;
      padding:24px;text-align:center;margin:0 0 24px;">
      <p style="color:#166534;font-size:13px;margin:0 0 4px;">
        Amount transferred
      </p>
      <p style="color:#15803D;font-size:36px;font-weight:700;
        margin:0;font-family:serif;">
        ${amount}
      </p>
    </div>
    <div style="background:#F9FAFB;border-radius:8px;
      padding:16px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#555;">
        <strong>To:</strong> ${bankName} · ${accountNumber}
      </p>
      <p style="margin:0;font-size:13px;color:#555;">
        <strong>Reference:</strong>
        <span style="font-family:monospace;">${reference}</span>
      </p>
    </div>
    <p style="color:#555;font-size:13px;text-align:center;">
      Funds typically arrive within a few hours.
      Contact support@foleio.com if you haven't
      received it within 24 hours.
    </p>
  `);
}
