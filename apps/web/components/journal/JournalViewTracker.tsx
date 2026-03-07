'use client';

import { useEffect } from 'react';

export function JournalViewTracker({ entryId }: { entryId: string }) {
  useEffect(() => {
    void fetch(`/api/journal/${entryId}/views`, { method: 'POST' });
  }, [entryId]);

  return null;
}
