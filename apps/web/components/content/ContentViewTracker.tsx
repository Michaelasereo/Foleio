'use client';

import { useEffect } from 'react';

export function ContentViewTracker({
  contentId,
  isCreatorView,
}: {
  contentId: string;
  isCreatorView: boolean;
}) {
  useEffect(() => {
    if (isCreatorView) return;
    const key = `foleio:viewed:content:${contentId}`;
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    void fetch(`/api/content/${contentId}/views`, { method: 'POST' });
  }, [contentId, isCreatorView]);

  return null;
}
