'use client';

import { FoleioStatusPage } from '@/components/system/FoleioStatusPage';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <FoleioStatusPage
      title="Something went wrong"
      description={
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Please try again or contact support if this keeps happening.'
      }
      primaryAction={{ label: 'Try again', onClick: reset }}
      secondaryAction={{ label: 'Go home', href: '/', variant: 'outline' }}
    />
  );
}
