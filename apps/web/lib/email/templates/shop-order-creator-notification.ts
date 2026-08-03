import {
  darkEmailCta,
  darkEmailDetailRows,
  darkEmailMuted,
  formatNairaAmount,
  renderFoleioDarkEmail,
} from '@/lib/email/foleio-dark-email';

export function shopOrderCreatorNotificationEmail({
  creatorName,
  customerName,
  customerEmail,
  customerPhone,
  items,
  subtotal,
  deliveryFee,
  total,
  deliveryLabel,
  isGift,
  giftRecipientName,
  ordersUrl,
}: {
  creatorName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryLabel?: string | null;
  isGift?: boolean;
  giftRecipientName?: string | null;
  ordersUrl: string;
}) {
  const itemSummary = items
    .map((item) => `${item.quantity}× ${item.name}`)
    .join(', ');

  const subject = isGift
    ? `New gift order from ${customerName}`
    : `New shop order from ${customerName}`;

  const rows = [
    { label: 'Buyer', value: customerName || 'Customer' },
    { label: 'Email', value: customerEmail },
  ];
  if (customerPhone) {
    rows.push({ label: 'Phone', value: customerPhone });
  }
  if (isGift) {
    rows.push({
      label: 'Gift for',
      value: giftRecipientName || 'Gift recipient',
    });
  }
  rows.push(
    { label: 'Items', value: itemSummary || '—' },
    { label: 'Subtotal', value: formatNairaAmount(subtotal / 100) },
    { label: 'Delivery', value: formatNairaAmount(deliveryFee / 100) },
    { label: 'Total paid', value: formatNairaAmount(total / 100) }
  );
  if (deliveryLabel) {
    rows.push({ label: 'Fulfillment', value: deliveryLabel });
  }

  const bodyHtml = `
    ${darkEmailMuted(
      isGift
        ? `Hi ${creatorName} — you received a paid gift order on Foleio.`
        : `Hi ${creatorName} — you have a new paid shop order on Foleio.`
    )}
    ${darkEmailDetailRows(rows)}
    ${darkEmailCta('View orders', ordersUrl)}
  `;

  const html = renderFoleioDarkEmail({
    previewText: isGift
      ? `Gift order from ${customerName}`
      : `New shop order from ${customerName}`,
    title: isGift ? 'New gift order' : 'New shop order',
    bodyHtml,
    footerNote: 'Manage this order anytime from your Foleio shop dashboard.',
  });

  return { subject, html };
}
