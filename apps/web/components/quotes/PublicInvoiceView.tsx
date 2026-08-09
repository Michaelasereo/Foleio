'use client';

import type { ReactNode } from 'react';
import {
  InvoiceDocument,
  type InvoiceDocumentData,
  type InvoiceDocLineItem,
} from '@/components/booking/InvoiceDocument';

function toDocLines(
  items: Array<{
    id: string;
    label: string;
    amountKobo: number;
    productId?: string | null;
    qty?: number;
  }>
): InvoiceDocLineItem[] {
  if (!items.length) {
    return [
      {
        id: 'empty',
        label: 'No items',
        detail: '',
        qty: 1,
        unitPriceNaira: 0,
      },
    ];
  }
  return items.map((item) => {
    const [label, ...rest] = String(item.label || 'Item').split(' — ');
    const qty = Math.max(1, Math.round(Number(item.qty) || 1));
    const naira = Math.max(0, (item.amountKobo || 0) / 100 / qty);
    return {
      id: item.id,
      label: label || 'Item',
      detail: rest.join(' — '),
      qty,
      unitPriceNaira: naira,
      productId: item.productId || null,
    };
  });
}

export function PublicInvoiceView({
  quote,
  paySlot,
}: {
  quote: {
    id: string;
    title: string;
    status: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    serviceDate?: string | null;
    validUntil?: string | null;
    notes?: string | null;
    lineItems: Array<{
      id: string;
      label: string;
      amountKobo: number;
      productId?: string | null;
      qty?: number;
    }>;
    totalAmount: number;
    depositAmount: number;
    balanceAmount: number;
    deliveryFeeMode?: string | null;
    deliveryTierId?: string | null;
    deliveryFeeKobo?: number | null;
    companyName: string;
    companyEmail: string;
    companyPhone: string;
  };
  paySlot: ReactNode;
}) {
  const noteLines = String(quote.notes || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const termsNote =
    noteLines.find((l) => !/^Discount:/i.test(l)) ||
    (quote.validUntil
      ? `Valid until ${String(quote.validUntil).slice(0, 10)}`
      : 'Terms: 7 days from issue date');

  const deliveryMode =
    quote.deliveryFeeMode === 'tier' || quote.deliveryFeeMode === 'custom'
      ? quote.deliveryFeeMode
      : 'none';

  const doc: InvoiceDocumentData = {
    invoiceNumber: `#INV-${quote.id.slice(-6).toUpperCase()}`,
    issueDate: new Date().toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    clientName: quote.customerName,
    subject: quote.title,
    companyName: quote.companyName,
    linkedServiceId: '',
    customerEmail: quote.customerEmail,
    customerPhone: quote.customerPhone || '',
    customerAddress: quote.customerAddress || '',
    serviceDate: quote.serviceDate ? String(quote.serviceDate).slice(0, 10) : '',
    lineItems: toDocLines(quote.lineItems),
    discountNaira: 0,
    paymentNote: '',
    termsNote,
    companyAddress: '',
    companyCity: '',
    companyTaxId: '',
    companyEmail: quote.companyEmail || '',
    companyPhone: quote.companyPhone || '',
    deliveryFeeMode: deliveryMode,
    deliveryTierId: quote.deliveryTierId || '',
    deliveryFeeNaira: Math.max(0, (Number(quote.deliveryFeeKobo) || 0) / 100),
  };

  return <InvoiceDocument mode="preview" value={doc} paySlot={paySlot} />;
}
