'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreatorAnalyticsClient } from '@/components/creator/CreatorAnalyticsClient';
import { EarningsDashboard } from '@/components/creator/EarningsDashboard';

type PrimaryView = 'earnings' | 'analytics';

export function EarningsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialView: PrimaryView =
    tabParam === 'analytics' ? 'analytics' : 'earnings';
  const [primaryView, setPrimaryView] = useState<PrimaryView>(initialView);

  useEffect(() => {
    setPrimaryView(tabParam === 'analytics' ? 'analytics' : 'earnings');
  }, [tabParam]);

  function setView(view: PrimaryView) {
    setPrimaryView(view);
    router.replace(view === 'earnings' ? '/earnings' : '/earnings?tab=analytics');
  }

  return (
    <div>
      <div className="foleio-dash-header">
        <div>
          <h1 className="foleio-auth-title">
            {primaryView === 'analytics' ? 'Analytics' : 'Earnings'}
          </h1>
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
            {primaryView === 'analytics'
              ? 'Bookings and shop performance over time.'
              : 'Full payments and deposits, your share after platform fee.'}
          </p>
        </div>
      </div>

      <div className="foleio-dash-tabs" role="tablist" aria-label="Earnings views">
        <button
          type="button"
          role="tab"
          aria-selected={primaryView === 'earnings'}
          className={`foleio-dash-tab${primaryView === 'earnings' ? ' is-active' : ''}`}
          onClick={() => setView('earnings')}
          data-tour="earnings-tab"
        >
          Earnings
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={primaryView === 'analytics'}
          className={`foleio-dash-tab${primaryView === 'analytics' ? ' is-active' : ''}`}
          onClick={() => setView('analytics')}
          data-tour="analytics"
        >
          Analytics
        </button>
      </div>

      {primaryView === 'analytics' ? (
        <CreatorAnalyticsClient hideHeader />
      ) : (
        <EarningsDashboard hideHeader />
      )}
    </div>
  );
}
