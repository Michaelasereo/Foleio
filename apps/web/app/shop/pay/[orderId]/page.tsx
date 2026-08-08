'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FoleioStatusPage } from '@/components/system/FoleioStatusPage';

export default function ShopOrderPayPage() {
  const params = useParams();
  const orderId = String(params.orderId || '');
  const [error, setError] = useState<string | null>(null);
  const [shopHref, setShopHref] = useState('/');

  useEffect(() => {
    if (!orderId) {
      setError('Missing order');
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`/api/shop/orders/${encodeURIComponent(orderId)}/pay`, {
          method: 'POST',
        });
        const data = await response.json();
        if (data.shopHref) setShopHref(String(data.shopHref));
        if (!response.ok) {
          throw new Error(data.error || 'Could not resume payment');
        }
        if (!data.paystackUrl) {
          throw new Error('Could not resume payment');
        }
        window.location.href = data.paystackUrl;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not resume payment');
      }
    })();
  }, [orderId]);

  if (error) {
    return (
      <FoleioStatusPage
        title="Could not resume payment"
        description={error}
        primaryAction={{ label: 'Back to shop', href: shopHref }}
        secondaryAction={{ label: 'Go home', href: '/', variant: 'outline' }}
      />
    );
  }

  return (
    <FoleioStatusPage
      title="Resuming payment"
      description="Taking you to checkout…"
      icon={<Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.75} />}
      primaryAction={{ label: 'Cancel', href: shopHref }}
    >
      <p style={{ margin: '12px 0 0', fontSize: 13, color: '#adadad' }}>
        If nothing happens,{' '}
        <Link href={shopHref} style={{ color: '#f4f4f5', textDecoration: 'underline' }}>
          return to the shop
        </Link>
        .
      </p>
    </FoleioStatusPage>
  );
}
