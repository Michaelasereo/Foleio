'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreatorAnalyticsClient } from '@/components/creator/CreatorAnalyticsClient';
import { EarningsDashboard } from '@/components/creator/EarningsDashboard';
import styles from '@/components/demo/demo-dashboard.module.css';
import type { EarningsView } from '@/components/creator/earnings-live';

export function EarningsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialView: EarningsView =
    tabParam === 'analytics' ? 'analytics' : tabParam === 'payouts' ? 'payouts' : 'earnings';
  const [primaryView, setPrimaryView] = useState<EarningsView>(initialView);

  useEffect(() => {
    setPrimaryView(
      tabParam === 'analytics' ? 'analytics' : tabParam === 'payouts' ? 'payouts' : 'earnings'
    );
  }, [tabParam]);

  function setView(view: EarningsView) {
    setPrimaryView(view);
    router.replace(view === 'earnings' ? '/earnings' : `/earnings?tab=${view}`);
  }

  return (
    <div className={styles.shell} style={{ display: 'block', minHeight: 0, width: '100%', background: 'transparent' }}>
      <div className={styles.home}>
        {primaryView === 'analytics' ? (
          <CreatorAnalyticsClient onView={setView} />
        ) : (
          <EarningsDashboard presentation={primaryView} onView={setView} />
        )}
      </div>
    </div>
  );
}
