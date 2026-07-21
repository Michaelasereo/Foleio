import {
  darkEmailCta,
  darkEmailMuted,
  formatNairaAmount,
  renderFoleioDarkEmail,
} from '@/lib/email/foleio-dark-email';
import {
  formatFreeFeeLabel,
  formatPlanPrice,
  formatProFeeLabel,
  PLATFORM_PLAN_AMOUNTS_KOBO,
  planDiscountPercent,
} from '@/lib/billing/platform-plans';

export type UnderstandYourFeesEmailParams = {
  displayName: string;
  billingUrl: string;
  siteUrl?: string;
  logoSrc?: string;
};

const FEE_EXAMPLES: Array<{
  saleKobo: number;
  freeFeeKobo: number;
  proFeeKobo: number;
  saveKobo: number;
}> = [
  { saleKobo: 500_000, freeFeeKobo: 27_500, proFeeKobo: 19_000, saveKobo: 8_500 },
  { saleKobo: 1_000_000, freeFeeKobo: 45_000, proFeeKobo: 28_000, saveKobo: 17_000 },
  { saleKobo: 20_000_000, freeFeeKobo: 710_000, proFeeKobo: 370_000, saveKobo: 340_000 },
  { saleKobo: 30_000_000, freeFeeKobo: 1_060_000, proFeeKobo: 550_000, saveKobo: 510_000 },
];

function nairaFromKobo(kobo: number): string {
  return formatNairaAmount(kobo / 100);
}

function sectionLabel(text: string) {
  return `<p style="margin:24px 0 10px;color:#828282;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">${text}</p>`;
}

function planBlock(opts: {
  title: string;
  priceLine: string;
  feeLabel: string;
  bullets: string[];
}): string {
  const bullets = opts.bullets
    .map(
      (b) => `
      <tr>
        <td style="padding:0 0 8px;color:#828282;font-size:13px;vertical-align:top;width:14px;">•</td>
        <td style="padding:0 0 8px;color:#adadad;font-size:13px;font-weight:500;line-height:1.5;">${b}</td>
      </tr>`
    )
    .join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2b2b2b;border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin:0 0 12px;">
      <tr>
        <td style="padding:18px 18px 10px;">
          <p style="margin:0 0 4px;color:#828282;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">${opts.title}</p>
          <p style="margin:0 0 6px;color:#fafafa;font-size:18px;font-weight:500;letter-spacing:-0.02em;">${opts.priceLine}</p>
          <p style="margin:0 0 14px;color:#f4f4f5;font-size:14px;font-weight:500;">
            ${opts.feeLabel}
            <span style="color:#828282;font-weight:500;"> per transaction</span>
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">${bullets}</table>
        </td>
      </tr>
    </table>`;
}

/**
 * Welcome / fees education email — Free vs Pro (dark Foleio shell).
 */
export function understandYourFeesEmail({
  displayName,
  billingUrl,
  siteUrl,
  logoSrc,
}: UnderstandYourFeesEmailParams): { subject: string; html: string } {
  const freeFee = formatFreeFeeLabel();
  const proFee = formatProFeeLabel();
  const monthly = formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.monthly);
  const quarterly = formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.quarterly);
  const discountPct = planDiscountPercent('pro', 'quarterly') || 17;

  const exampleRows = FEE_EXAMPLES.map((row, i) => {
    const border =
      i === FEE_EXAMPLES.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)';
    return `
      <tr>
        <td style="padding:10px 0;color:#f4f4f5;font-size:12px;font-weight:500;border-bottom:${border};">${nairaFromKobo(row.saleKobo)}</td>
        <td style="padding:10px 0;color:#adadad;font-size:12px;font-weight:500;border-bottom:${border};">${nairaFromKobo(row.freeFeeKobo)}</td>
        <td style="padding:10px 0;color:#adadad;font-size:12px;font-weight:500;border-bottom:${border};">${nairaFromKobo(row.proFeeKobo)}</td>
        <td style="padding:10px 0;color:#fafafa;font-size:12px;font-weight:600;border-bottom:${border};">${nairaFromKobo(row.saveKobo)}</td>
      </tr>`;
  }).join('');

  const bodyHtml = `
    ${darkEmailMuted(
      `Hey <span style="color:#f4f4f5;">${displayName}</span> — two plans, one simple choice: pay a little more per sale with no subscription, or pay less per sale for a small monthly fee.`
    )}

    ${planBlock({
      title: 'Free',
      priceLine: '₦0 to join',
      feeLabel: freeFee,
      bullets: [
        'Full access to bookings, shop, and tools',
        'Up to 10 services and 10 products (5 preorders)',
        'One Home portfolio gallery',
      ],
    })}

    ${planBlock({
      title: 'Pro',
      priceLine: `${monthly}/month · ${quarterly}/quarter <span style="color:#828282;font-size:13px;">(save ${discountPct}%)</span>`,
      feeLabel: proFee,
      bullets: [
        'Everything on Free',
        'Unlimited services &amp; products',
        'Up to 3 portfolio categories',
        'Schedule templates',
        'Self-serve upgrade, any time',
      ],
    })}

    ${sectionLabel('What you’d actually pay')}
    <p style="margin:0 0 12px;color:#adadad;font-size:13px;font-weight:500;line-height:1.55;">
      Here’s the fee on a few common sale amounts, side by side.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2b2b2b;border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin:0 0 12px;">
      <tr>
        <td style="padding:8px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:10px 0;color:#828282;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.08);">Sale</td>
              <td style="padding:10px 0;color:#828282;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.08);">Free</td>
              <td style="padding:10px 0;color:#828282;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.08);">Pro</td>
              <td style="padding:10px 0;color:#828282;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.08);">Save</td>
            </tr>
            ${exampleRows}
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:#828282;font-size:13px;font-weight:500;line-height:1.55;">
      The bigger the sale, the more Pro saves you — the gap is always <span style="color:#f4f4f5;">1.7%</span> of the sale amount.
    </p>

    ${sectionLabel('Is Pro worth it for you?')}
    <p style="margin:0 0 12px;color:#adadad;font-size:13px;font-weight:500;line-height:1.55;">
      Pro’s savings on transaction fees need to cover its subscription cost before it “pays for itself.” As a rough guide:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
      <tr>
        <td style="padding:0 0 10px;color:#adadad;font-size:13px;font-weight:500;line-height:1.55;">
          • On the <span style="color:#f4f4f5;">monthly</span> plan, once you’re doing more than about <span style="color:#f4f4f5;">₦176,000 a month</span> in total sales and bookings, Pro comes out ahead.
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 10px;color:#adadad;font-size:13px;font-weight:500;line-height:1.55;">
          • On the <span style="color:#f4f4f5;">quarterly</span> plan, that drops to about <span style="color:#f4f4f5;">₦147,000 a month</span>, since you’re already saving ${discountPct}% on the subscription itself.
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:#adadad;font-size:13px;font-weight:500;line-height:1.55;">
      If you’re doing a handful of big-ticket sales or bookings each month, it’s worth switching. If you’re just getting started with smaller, occasional sales, Free covers you with no risk.
    </p>

    ${darkEmailCta('Go to Billing', billingUrl)}
    <p style="margin:0;color:#828282;font-size:12px;font-weight:500;line-height:1.5;text-align:center;">
      Switch any time from Settings → Billing — self-serve, no waiting on approval.
    </p>
  `;

  const subject = 'Understand your fees on Foleio';
  const html = renderFoleioDarkEmail({
    previewText:
      'Two plans, one simple choice — Free or Pro. See what you’d actually pay on real sale amounts.',
    title: 'Understand your fees',
    bodyHtml,
    siteUrl,
    logoSrc,
    footerNote: 'You received this email because you have a Foleio creator account.',
  });

  return { subject, html };
}
