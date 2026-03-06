'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import { getCreatorPlan, getPlanLimits } from '@/lib/utils/plan-limits';

interface NewCollectionButtonProps {
  platformPlan: string | null;
  label?: string;
}

export function NewCollectionButton({
  platformPlan,
  label = 'New Collection',
}: NewCollectionButtonProps) {
  const router = useRouter();
  const { isOpen, limitType, showUpgradeModal, closeUpgradeModal } = useUpgradeModal();
  const currentPlan = getCreatorPlan(platformPlan);
  const limits = getPlanLimits(platformPlan);

  const handleClick = () => {
    if (!limits.canCreateCollections) {
      showUpgradeModal('canCreateCollections');
      return;
    }
    router.push('/collections/new');
  };

  return (
    <>
      <Button onClick={handleClick}>
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Button>
      {limitType ? (
        <UpgradeModal
          isOpen={isOpen}
          onClose={closeUpgradeModal}
          limitType={limitType}
          currentPlan={currentPlan}
        />
      ) : null}
    </>
  );
}
