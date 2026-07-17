import { serializeForClient } from '@/lib/utils';
import { getPublicPortfolio } from '@/lib/actions/portfolio';
import { PublicGalleryPanel } from '@/components/creator/public/PublicGalleryPanel';

export async function PublicPortfolioSection({
  creatorId,
  username,
}: {
  creatorId: string;
  username: string;
}) {
  const sections = await getPublicPortfolio(creatorId);
  return (
    <PublicGalleryPanel
      username={username}
      initialSections={serializeForClient(sections)}
    />
  );
}

export function GallerySectionSkeleton() {
  return (
    <section className="foleio-public-panel" aria-busy="true" aria-label="Loading gallery">
      <div
        style={{
          height: 18,
          width: 100,
          borderRadius: 6,
          background: '#2c2c2c',
          marginBottom: 8,
          animation: 'foleio-public-pulse 1.4s ease-in-out infinite',
        }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
          marginTop: 12,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              borderRadius: 10,
              background: '#2c2c2c',
              animation: 'foleio-public-pulse 1.4s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    </section>
  );
}
