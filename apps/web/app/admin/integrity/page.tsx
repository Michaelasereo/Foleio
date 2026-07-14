'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  adminMutedClass,
  adminTabActiveClass,
  adminTabIdleClass,
} from '@/lib/admin/format';
import AdminTransactionsPage from '../transactions/page';
import AdminWebhooksPage from '../webhooks/page';

type Tab = 'transactions' | 'webhooks';

export default function AdminIntegrityPage() {
  const [tab, setTab] = useState<Tab>('transactions');

  const tabs = useMemo(
    () =>
      [
        { key: 'transactions' as const, label: 'Transactions' },
        { key: 'webhooks' as const, label: 'Webhooks / reconciliation' },
      ] as const,
    []
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="foleio-admin-title">Integrity</h2>
        <p className={`foleio-admin-meta ${adminMutedClass}`}>
          Money movement and webhook reconciliation
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant="ghost"
            className={tab === item.key ? adminTabActiveClass : adminTabIdleClass}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {tab === 'transactions' ? <AdminTransactionsPage embedded /> : <AdminWebhooksPage embedded />}
    </div>
  );
}
