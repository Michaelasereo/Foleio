import { CreatorAgreementContent } from '@/components/legal/CreatorAgreementContent';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { Italic } from '@/components/landing/ui';

export const metadata = {
  title: 'Creator Agreement · Foleio',
  description:
    'Creator Agreement governing the relationship between creators and Foleio.',
};

export default function CreatorAgreementPage() {
  return (
    <LegalDocument
      active="/legal/creator-agreement"
      title={
        <>
          Creator <Italic>Agreement</Italic>
        </>
      }
      effective="Effective July 2026 · Last updated 12 October 2026"
    >
      <CreatorAgreementContent />
    </LegalDocument>
  );
}
