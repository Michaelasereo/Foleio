'use client';

type ShareTemplate = 'default' | 'dark' | 'minimal' | 'bold';

interface ShareCardPreviewProps {
  template: ShareTemplate;
  title: string;
  subtitle?: string | null;
  creatorName: string;
  creatorAvatar?: string | null;
  coverImage?: string | null;
  readTime?: number;
  tags?: string[];
  size?: 'thumbnail' | 'full';
}

function Wrapper({
  children,
  size = 'full',
}: {
  children: React.ReactNode;
  size?: 'thumbnail' | 'full';
}) {
  const scale = size === 'thumbnail' ? 0.22 : 0.6;
  return (
    <div className="w-full overflow-hidden rounded-xl bg-background">
      <div
        style={{
          width: 1200,
          height: 628,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          marginBottom: size === 'thumbnail' ? -488 : -252,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ShareCardPreview({
  template,
  title,
  subtitle,
  creatorName,
  creatorAvatar,
  coverImage,
  readTime = 1,
  tags = [],
  size = 'full',
}: ShareCardPreviewProps) {
  const cleanTitle = title || 'Untitled Entry';

  if (template === 'dark') {
    return (
      <Wrapper size={size}>
        <div
          id={size === 'full' ? 'share-card' : undefined}
          style={{
            width: 1200,
            height: 628,
            background: '#1C1008',
            color: '#fff',
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ color: '#F97316', fontSize: 22, fontWeight: 700 }}>Foleio Journal</div>
          <div>
            <div style={{ fontSize: cleanTitle.length > 50 ? 44 : 56, fontWeight: 800, lineHeight: 1.1 }}>
              {cleanTitle}
            </div>
            {subtitle ? <div style={{ marginTop: 16, color: '#D6CFC8', fontSize: 24 }}>{subtitle}</div> : null}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16 }}>
              {creatorName} · {readTime} min read
            </div>
            <div style={{ background: '#F97316', padding: '10px 22px', borderRadius: 999, fontWeight: 700 }}>
              Read now →
            </div>
          </div>
        </div>
      </Wrapper>
    );
  }

  if (template === 'minimal') {
    return (
      <Wrapper size={size}>
        <div
          id={size === 'full' ? 'share-card' : undefined}
          style={{
            width: 1200,
            height: 628,
            background: '#fff',
            color: '#111',
            padding: '70px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 18, color: '#F97316', fontWeight: 700 }}>Foleio Journal</div>
          <div style={{ fontSize: cleanTitle.length > 50 ? 42 : 54, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
            {cleanTitle}
          </div>
          <div style={{ fontSize: 15, color: '#6B7280' }}>
            {creatorName} · {readTime} min read
          </div>
        </div>
      </Wrapper>
    );
  }

  if (template === 'bold') {
    return (
      <Wrapper size={size}>
        <div
          id={size === 'full' ? 'share-card' : undefined}
          style={{
            width: 1200,
            height: 628,
            position: 'relative',
            overflow: 'hidden',
            background: '#F97316',
          }}
        >
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
            }}
          />
          <div style={{ position: 'absolute', left: 60, right: 60, bottom: 60, color: 'white' }}>
            <div style={{ fontSize: cleanTitle.length > 50 ? 44 : 56, fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
              {cleanTitle}
            </div>
            <div style={{ fontSize: 16 }}>{creatorName} · {readTime} min read</div>
          </div>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper size={size}>
      <div
        id={size === 'full' ? 'share-card' : undefined}
        style={{
          width: 1200,
          height: 628,
          background: '#F5F0E8',
          fontFamily: 'DM Sans, sans-serif',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -100,
            top: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(249,115,22,0.1)',
          }}
        />

        <div style={{ fontSize: 20, fontWeight: 700, color: '#F97316', letterSpacing: '-0.5px' }}>
          Foleio Journal
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 40, paddingBottom: 40 }}>
          {tags?.[0] ? (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F97316', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
              {tags[0]}
            </div>
          ) : null}
          <div style={{ fontSize: cleanTitle.length > 50 ? 42 : 52, fontWeight: 800, color: '#1C1008', lineHeight: 1.1, letterSpacing: '-1px', maxWidth: 800, marginBottom: subtitle ? 20 : 0 }}>
            {cleanTitle}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 22, color: '#6B5E52', lineHeight: 1.4, maxWidth: 700 }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {creatorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creatorAvatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
            ) : null}
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1008' }}>{creatorName}</div>
              <div style={{ fontSize: 13, color: '#9E8E82' }}>{readTime} min read · yourfoleio.com</div>
            </div>
          </div>

          <div style={{ background: '#F97316', color: 'white', padding: '10px 24px', borderRadius: 100, fontSize: 15, fontWeight: 700 }}>
            Read now →
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
