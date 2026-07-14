'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { FoleioStatusPage } from '@/components/system/FoleioStatusPage';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const trxref = searchParams.get('trxref');

  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      const ref = reference || trxref;

      if (!ref) {
        setStatus('failed');
        setMessage('No payment reference found');
        return;
      }

      try {
        const response = await fetch(`/api/payments/verify/${ref}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage('Payment successful! You now have access.');
        } else {
          setStatus('failed');
          setMessage(data.error || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('failed');
        setMessage('Failed to verify payment. Please contact support.');
      }
    };

    void verifyPayment();
  }, [reference, trxref]);

  if (status === 'loading') {
    return (
      <FoleioStatusPage
        title="Processing payment"
        description={message}
        icon={<Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.5} />}
      />
    );
  }

  if (status === 'success') {
    return (
      <FoleioStatusPage
        title="Payment successful"
        description={message}
        icon={<CheckCircle className="h-6 w-6" strokeWidth={1.5} />}
        iconTone="ok"
        primaryAction={{
          label: 'Go back to content',
          onClick: () => router.back(),
        }}
        secondaryAction={{
          label: 'Go to dashboard',
          href: '/fan/dashboard',
          variant: 'outline',
        }}
      >
        <p className="foleio-status-desc" style={{ marginTop: 16 }}>
          A verification code has been sent to your email. Use it to access your
          purchased content.
        </p>
      </FoleioStatusPage>
    );
  }

  return (
    <FoleioStatusPage
      title="Payment failed"
      description={message}
      icon={<XCircle className="h-6 w-6" strokeWidth={1.5} />}
      iconTone="err"
      primaryAction={{
        label: 'Try again',
        onClick: () => router.back(),
      }}
      secondaryAction={{
        label: 'Go home',
        href: '/',
        variant: 'outline',
      }}
    />
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <FoleioStatusPage
          title="Loading"
          description="Preparing payment status…"
          icon={<Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.5} />}
        />
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
