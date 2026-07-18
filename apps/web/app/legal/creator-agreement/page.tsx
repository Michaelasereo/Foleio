import { CreatorAgreementContent } from '@/components/legal/CreatorAgreementContent';

export const metadata = {
  title: 'Creator Agreement · Foleio',
  description:
    'Creator Agreement governing the relationship between creators and Foleio.',
};

export default function CreatorAgreementPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="mb-2 text-4xl font-medium tracking-tight text-foreground">
        Creator Agreement
      </h1>
      <p className="text-muted-foreground text-sm mb-10">
        Effective Date: July 2026 · Last Updated: July 2026
      </p>
      <div className="legal-content">
        <CreatorAgreementContent />
      </div>
    </div>
  );
}
