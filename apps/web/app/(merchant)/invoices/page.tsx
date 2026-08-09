import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { prisma } from '@foleio/database';
import { QuotesManager } from '@/components/booking/QuotesManager';
import { getCreatorForUser, getCurrentUser } from '@/lib/creator/cached-lookups';
import { serializeForClient } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function InvoicesLoading() {
  return (
    <div className="foleio-dash-panel" style={{ padding: 24 }}>
      <p className="foleio-dash-panel-meta">Loading…</p>
    </div>
  );
}

export default async function InvoicesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  let creator: Awaited<ReturnType<typeof getCreatorForUser>> = null;
  try {
    creator = await getCreatorForUser(user.id);
  } catch {
    return (
      <div>
        <h1 className="foleio-auth-title">Quotes & Invoice</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          We could not load your data right now. Please try again in a moment.
        </p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div>
        <h1 className="foleio-auth-title">Quotes & Invoice</h1>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 8 }}>
          Finish setting up your creator profile in Settings to manage quotes and invoices.
        </p>
      </div>
    );
  }

  if (!creator.customQuotesEnabled) {
    return (
      <div>
        <div className="foleio-dash-header">
          <div>
            <h1 className="foleio-auth-title">Quotes & Invoice</h1>
            <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
              Turn on Custom quotes to manage quote requests and send invoices
            </p>
          </div>
        </div>
        <div className="foleio-dash-panel" style={{ padding: 20, maxWidth: 520 }}>
          <p className="foleio-dash-panel-meta" style={{ marginTop: 0 }}>
            This module is off for your account. Enable it in Settings → Modules, then
            come back here.
          </p>
          <Link href="/settings?tab=offerings" className="foleio-dash-btn-primary">
            Open Modules
          </Link>
        </div>
      </div>
    );
  }

  const servicesRaw = await prisma.priceListItem.findMany({
    where: { creatorId: creator.id },
    select: { id: true, name: true, isActive: true },
    orderBy: [{ categoryOrderIndex: 'asc' }, { orderIndex: 'asc' }],
  });
  const initialServices = serializeForClient(servicesRaw);

  const productsRaw = await prisma.product.findMany({
    where: { creatorId: creator.id, status: 'active' },
    select: {
      id: true,
      name: true,
      price: true,
      type: true,
      stock: true,
      status: true,
    },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });
  const initialProducts = serializeForClient(productsRaw);

  const deliveryTiersRaw = await prisma.deliveryTier.findMany({
    where: { creatorId: creator.id },
    select: {
      id: true,
      name: true,
      type: true,
      flatRate: true,
      minSubtotalKobo: true,
      minItemQuantity: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  const initialDeliveryTiers = serializeForClient(deliveryTiersRaw);

  const userProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, phoneNumber: true },
  });

  return (
    <div>
      <div className="foleio-dash-header">
        <div>
          <h1 className="foleio-auth-title">Quotes & Invoice</h1>
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 0, marginTop: 6 }}>
            Review quote requests and send invoices for booking services and shop products
          </p>
        </div>
      </div>
      <Suspense fallback={<InvoicesLoading />}>
        <QuotesManager
          initialServices={initialServices}
          initialProducts={initialProducts}
          initialDeliveryTiers={initialDeliveryTiers}
          creator={{
            displayName: creator.displayName,
            email: userProfile?.email || user.email || null,
            phone: userProfile?.phoneNumber || null,
          }}
        />
      </Suspense>
    </div>
  );
}
