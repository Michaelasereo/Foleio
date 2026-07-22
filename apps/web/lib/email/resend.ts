import { Resend } from 'resend';
import { baseEmailTemplate } from './base-template';

export const resend = new Resend(process.env.RESEND_API_KEY);

/** Prefer RESEND_FROM_EMAIL (verified domain in Resend). */
export function resolveFromEmail() {
  const raw = (process.env.RESEND_FROM_EMAIL || '').trim();
  if (!raw) return 'Foleio <noreply@foleio.com>';
  if (raw.includes('<')) return raw;
  return `Foleio <${raw}>`;
}

export const FROM_EMAIL = resolveFromEmail();

function canSendEmails() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RESEND_SEND_IN_DEV === 'true'
  );
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!canSendEmails()) {
    console.log('📧 Email skipped (dev mode):', subject, to);
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: resolveFromEmail(),
      to,
      subject,
      html,
    });
    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false };
  }
}

export async function sendWelcomeEmail({
  email,
  displayName,
  username,
}: {
  email: string;
  displayName: string;
  username: string;
}) {
  if (!canSendEmails()) {
    console.log('📧 Email skipped (dev mode):', `Welcome to Foleio, ${displayName} 🧡`, email);
    return { success: true };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';

  try {
    const { data, error } = await resend.emails.send({
      from: resolveFromEmail(),
      to: email,
      subject: `Welcome to Foleio, ${displayName} 🧡`,
      html: baseEmailTemplate({
        previewText: "Your world is now live on Foleio. Here's how to get started.",
        body: `
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:#FFF4EC;border-radius:16px;padding:16px 24px;margin-bottom:24px;">
              <span style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#F97316;letter-spacing:-1px;">foleio.</span>
            </div>
          </div>

          <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:700;color:#1C1008;margin:0 0 16px;line-height:1.2;text-align:center;">
            Welcome to Foleio,<br/>${displayName} 🧡
          </h1>

          <p style="font-size:16px;color:#6B5E52;line-height:1.7;margin:0 0 32px;text-align:center;">
            Your world is now live. You're one of the first creators on Foleio — and that means something. Everything you build here is yours.
          </p>

          <div style="height:1px;background:#F0EAE0;margin:0 0 32px;"></div>

          <p style="font-size:13px;font-weight:700;color:#F97316;text-transform:uppercase;letter-spacing:1px;margin:0 0 20px;">
            Here's how to get started
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
            <tr>
              <td width="40" style="vertical-align:top;padding-top:2px;">
                <div style="width:28px;height:28px;background:#FFF4EC;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#F97316;">1</div>
              </td>
              <td style="vertical-align:top;">
                <p style="font-size:15px;font-weight:700;color:#1C1008;margin:0 0 4px;">Upload your first piece of content</p>
                <p style="font-size:14px;color:#9E8E82;margin:0;line-height:1.5;">
                  A video, a PDF, a mini-course — whatever your audience will love. Set a price and publish it.
                </p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
            <tr>
              <td width="40" style="vertical-align:top;padding-top:2px;">
                <div style="width:28px;height:28px;background:#FFF4EC;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#F97316;">2</div>
              </td>
              <td style="vertical-align:top;">
                <p style="font-size:15px;font-weight:700;color:#1C1008;margin:0 0 4px;">Share your profile card</p>
                <p style="font-size:14px;color:#9E8E82;margin:0;line-height:1.5;">
                  Go to Account Settings and download your profile card. Post it on your Instagram stories and let your audience know you're live.
                </p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
            <tr>
              <td width="40" style="vertical-align:top;padding-top:2px;">
                <div style="width:28px;height:28px;background:#FFF4EC;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#F97316;">3</div>
              </td>
              <td style="vertical-align:top;">
                <p style="font-size:15px;font-weight:700;color:#1C1008;margin:0 0 4px;">Write your first journal entry</p>
                <p style="font-size:14px;color:#9E8E82;margin:0;line-height:1.5;">
                  Share your story. Journal entries are free for all your fans to read — it's how they fall in love with your world before they subscribe.
                </p>
              </td>
            </tr>
          </table>

          <div style="text-align:center;margin-bottom:32px;">
            <a href="${baseUrl}/dashboard" style="display:inline-block;background:#F97316;color:white;padding:16px 36px;border-radius:100px;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:-0.3px;">
              Go to my dashboard →
            </a>
          </div>

          <div style="background:#F5F0E8;border-radius:14px;padding:16px 20px;text-align:center;margin-bottom:8px;">
            <p style="font-size:12px;color:#9E8E82;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
              Your public profile
            </p>
            <a href="${baseUrl}/creator/${username}" style="font-size:15px;font-weight:700;color:#F97316;text-decoration:none;">
              foleio.com/creator/${username}
            </a>
          </div>
        `,
      }),
    });

    if (error) {
      console.error('Welcome email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Welcome email send error:', error);
    return { success: false };
  }
}

type OrderConfirmationEmailProps = {
  email: string;
  fanName?: string;
  orderId: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    type?: 'physical' | 'digital' | null;
    digitalFileUrl?: string | null;
  }>;
  deliveryAddress: {
    address?: string;
    city?: string;
    state?: string;
  };
  deliveryTier?: {
    name?: string;
    estimatedDays?: string;
  } | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  creatorName: string;
};

export async function sendOrderConfirmationEmail({
  email,
  fanName,
  orderId,
  items,
  deliveryAddress,
  deliveryTier,
  subtotal,
  deliveryFee,
  total,
  creatorName,
  sampleTo,
}: OrderConfirmationEmailProps & { sampleTo?: string }) {
  if (!canSendEmails()) {
    console.log('📧 Email skipped (dev mode):', `Order confirmed — ${creatorName}`, email);
    if (sampleTo) {
      console.log('📧 Admin sample skipped (dev mode):', sampleTo);
    }
    return { success: true, sampleSent: Boolean(sampleTo) };
  }

  const digitalItems = items.filter(
    (item) => item.type === 'digital' && Boolean(item.digitalFileUrl)
  );
  const physicalItems = items.filter((item) => item.type !== 'digital');

  const itemsHtml = physicalItems
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;font-size:14px;color:#1C1008;">${item.quantity}x ${item.name}</td>
          <td style="padding:8px 0;font-size:14px;color:#1C1008;text-align:right;">₦${(
            (item.unitPrice * item.quantity) /
            100
          ).toLocaleString('en-NG')}</td>
        </tr>`
    )
    .join('');

  const subject = `Order confirmed — ${creatorName}'s Shop 🎉`;
  const html = baseEmailTemplate({
    previewText: "Your order has been confirmed. Here's your summary.",
    body: `
          <h1 style="font-size:28px;color:#1C1008;margin:0 0 12px;">Order Confirmed! 🎉</h1>
          <p style="font-size:15px;color:#6B5E52;line-height:1.6;">
            Hi ${fanName || 'there'}, your order from <strong>${creatorName}</strong> has been confirmed.
          </p>

          <div style="margin:20px 0;padding:16px;border:1px solid #F0EAE0;border-radius:12px;">
            <p style="margin:0 0 10px;font-size:13px;color:#9E8E82;">Order ID</p>
            <p style="margin:0;font-weight:700;color:#1C1008;">#${orderId.slice(-8).toUpperCase()}</p>
          </div>

          ${
            digitalItems.length > 0
              ? `
          <div style="background:#EFF6FF;border-radius:14px;padding:20px 24px;margin:0 0 20px;">
            <p style="font-size:13px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">
              Your Digital Downloads
            </p>
            ${digitalItems
              .map(
                (item) => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #DBEAFE;">
                <div>
                  <p style="font-size:14px;font-weight:600;color:#1C1008;margin:0 0 2px;">${item.name}</p>
                  <p style="font-size:12px;color:#6B5E52;margin:0;">PDF download</p>
                </div>
                <a href="${item.digitalFileUrl || '#'}" style="background:#3B5FDB;color:white;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none;">
                  Download →
                </a>
              </div>
            `
              )
              .join('')}
            <p style="font-size:11px;color:#6B7280;margin:12px 0 0;">
              Download links expire in 7 days. Save your files after downloading.
            </p>
          </div>
          `
              : ''
          }

          ${
            physicalItems.length > 0
              ? `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
            ${itemsHtml}
          </table>
          `
              : ''
          }

          <div style="border-top:1px solid #F0EAE0;padding-top:12px;margin-bottom:16px;">
            <p style="margin:4px 0;font-size:14px;color:#6B5E52;">Subtotal: ₦${(subtotal / 100).toLocaleString('en-NG')}</p>
            <p style="margin:4px 0;font-size:14px;color:#6B5E52;">Delivery: ₦${(deliveryFee / 100).toLocaleString('en-NG')}</p>
            <p style="margin:8px 0 0;font-size:16px;font-weight:700;color:#1C1008;">Total: ₦${(total / 100).toLocaleString('en-NG')}</p>
          </div>

          ${
            physicalItems.length > 0
              ? `
          <div style="margin:20px 0;padding:16px;border:1px solid #F0EAE0;border-radius:12px;">
            <p style="margin:0 0 8px;font-size:13px;color:#9E8E82;">Delivery</p>
            <p style="margin:0;font-size:14px;color:#1C1008;">
              ${deliveryAddress.address || ''} ${deliveryAddress.city || ''} ${deliveryAddress.state || ''}
            </p>
            <p style="margin:6px 0 0;font-size:13px;color:#6B5E52;">
              ${deliveryTier?.name || 'Digital delivery'} ${deliveryTier?.estimatedDays ? `· ${deliveryTier.estimatedDays}` : ''}
            </p>
          </div>
          `
              : ''
          }

          ${
            physicalItems.length > 0
              ? `
          <div style="text-align:center;margin:24px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/fan/dashboard"
              style="display:inline-block;background:#F97316;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600;">
              Track your order →
            </a>
          </div>
          `
              : ''
          }
        `,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: resolveFromEmail(),
      to: email,
      subject,
      html,
    });
    if (error) {
      console.error('Order confirmation email send error:', error);
      return { success: false, error: error.message };
    }

    let sampleSent = false;
    const sampleEmail = sampleTo?.trim().toLowerCase();
    if (sampleEmail && sampleEmail !== email.trim().toLowerCase()) {
      const sample = await resend.emails.send({
        from: resolveFromEmail(),
        to: sampleEmail,
        subject: `[Admin sample] ${subject}`,
        html,
      });
      if (sample.error) {
        console.error('Admin sample order email send failed:', sample.error);
      } else {
        sampleSent = true;
      }
    }

    return { success: true, id: data?.id, sampleSent };
  } catch (error) {
    console.error('Order confirmation email send error:', error);
    return { success: false };
  }
}

type GiftOrderEmailProps = {
  email: string;
  recipientName: string;
  buyerName: string;
  occasion?: 'birthday' | 'anniversary' | 'wedding' | 'special' | 'custom' | null;
  customOccasion?: string | null;
  giftMessage?: string | null;
  items: Array<{ name: string; quantity: number }>;
  creatorName: string;
};

function giftOccasionLabel(
  occasion: GiftOrderEmailProps['occasion'],
  custom?: string | null
) {
  if (occasion === 'custom') {
    const text = String(custom || '').trim();
    return text || 'a special occasion';
  }
  switch (occasion) {
    case 'birthday':
      return 'your birthday';
    case 'anniversary':
      return 'your anniversary';
    case 'wedding':
      return 'your wedding';
    case 'special':
      return 'a special occasion';
    default:
      return 'a special occasion';
  }
}

export async function sendGiftOrderEmail({
  email,
  recipientName,
  buyerName,
  occasion,
  customOccasion,
  giftMessage,
  items,
  creatorName,
}: GiftOrderEmailProps) {
  if (!canSendEmails()) {
    console.log('📧 Email skipped (dev mode):', `You've received a gift — ${creatorName}`, email);
    return { success: true };
  }

  const occasionText = giftOccasionLabel(occasion, customOccasion);
  const itemsHtml = items
    .map(
      (item) =>
        `<li style="margin:6px 0;font-size:14px;color:#1C1008;">${item.quantity}× ${item.name}</li>`
    )
    .join('');

  const subject = `You've received a gift from ${buyerName}! 🎁`;
  const html = baseEmailTemplate({
    previewText: `${buyerName} sent you a gift for ${occasionText}.`,
    body: `
          <h1 style="font-size:28px;color:#1C1008;margin:0 0 12px;">You've got a gift! 🎁</h1>
          <p style="font-size:15px;color:#6B5E52;line-height:1.6;">
            Hi ${recipientName}, <strong>${buyerName}</strong> sent you something special from
            <strong>${creatorName}</strong> for ${occasionText}.
          </p>
          ${
            giftMessage
              ? `
          <div style="margin:20px 0;padding:16px 20px;border-left:4px solid #F97316;background:#FFF7ED;border-radius:8px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#9E8E82;text-transform:uppercase;letter-spacing:0.5px;">Personal message</p>
            <p style="margin:0;font-size:15px;color:#1C1008;font-style:italic;line-height:1.6;">"${giftMessage}"</p>
          </div>
          `
              : ''
          }
          ${
            items.length > 0
              ? `
          <div style="margin:20px 0;padding:16px;border:1px solid #F0EAE0;border-radius:12px;">
            <p style="margin:0 0 10px;font-size:13px;color:#9E8E82;">What's inside</p>
            <ul style="margin:0;padding-left:18px;">${itemsHtml}</ul>
          </div>
          `
              : ''
          }
          <p style="font-size:14px;color:#6B5E52;line-height:1.6;margin-top:20px;">
            The buyer will receive delivery updates. Enjoy your gift!
          </p>
        `,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: resolveFromEmail(),
      to: email,
      subject,
      html,
    });
    if (error) {
      console.error('Gift order email send error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Gift order email send error:', error);
    return { success: false };
  }
}

type GiftCardCodeEmailProps = {
  email: string;
  code: string;
  balanceKobo: number;
  creatorName: string;
};

export async function sendGiftCardCodeEmail({
  email,
  code,
  balanceKobo,
  creatorName,
}: GiftCardCodeEmailProps) {
  if (!canSendEmails()) {
    console.log('📧 Email skipped (dev mode):', `Your gift card — ${creatorName}`, email);
    return { success: true };
  }

  const balance = `₦${(balanceKobo / 100).toLocaleString('en-NG')}`;
  const subject = `Your ${creatorName} gift card — ${balance} 🎉`;
  const html = baseEmailTemplate({
    previewText: `Your gift card code is ${code}. Balance: ${balance}.`,
    body: `
          <h1 style="font-size:28px;color:#1C1008;margin:0 0 12px;">Your gift card is ready! 🎉</h1>
          <p style="font-size:15px;color:#6B5E52;line-height:1.6;">
            Here's your gift card for <strong>${creatorName}</strong>'s shop.
          </p>
          <div style="margin:24px 0;padding:20px;border:2px dashed #F97316;border-radius:14px;text-align:center;background:#FFF7ED;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#9E8E82;text-transform:uppercase;letter-spacing:1px;">Gift card code</p>
            <p style="margin:0;font-size:26px;font-weight:800;color:#1C1008;letter-spacing:2px;font-family:monospace;">${code}</p>
            <p style="margin:12px 0 0;font-size:16px;font-weight:700;color:#F97316;">Balance: ${balance}</p>
          </div>
          <p style="font-size:14px;color:#6B5E52;line-height:1.6;">
            Enter this code at checkout on ${creatorName}'s shop to redeem your balance.
          </p>
        `,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: resolveFromEmail(),
      to: email,
      subject,
      html,
    });
    if (error) {
      console.error('Gift card code email send error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Gift card code email send error:', error);
    return { success: false };
  }
}
