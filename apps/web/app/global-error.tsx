'use client';

import { FoleioStatusPage } from '@/components/system/FoleioStatusPage';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#1a1816' }}>
        <FoleioStatusPage
          title="Something went wrong"
          description={
            process.env.NODE_ENV === 'development'
              ? error.message
              : 'A critical error occurred. Please try again.'
          }
          primaryAction={{ label: 'Try again', onClick: reset }}
          secondaryAction={{ label: 'Go home', href: '/', variant: 'outline' }}
        />
      </body>
    </html>
  );
}
