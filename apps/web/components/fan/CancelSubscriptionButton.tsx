'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CancelSubscriptionButton({ creatorId }: { creatorId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      await fetch('/api/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      className="border-red-200 text-red-600 hover:bg-red-50"
      onClick={handleCancel}
      disabled={loading}
    >
      {loading ? 'Cancelling...' : 'Cancel'}
    </Button>
  );
}
