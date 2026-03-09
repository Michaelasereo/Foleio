'use client';

type ProfileTemplate = 'world' | 'dark' | 'minimal' | 'bold' | 'cobalt';

interface ProfileCardPreviewProps {
  template: ProfileTemplate;
  creator: {
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
  };
  size?: 'thumbnail' | 'full';
  scale?: number;
}

export function ProfileCardPreview({
  template,
  creator,
  size = 'full',
  scale,
}: ProfileCardPreviewProps) {
  const cardScale = scale ?? (size === 'thumbnail' ? 160 / 1080 : 240 / 1080);
  const cardWidth = 1080;
  const cardHeight = 1920;
  const variant: 'warm' | 'dark' | 'cobalt' =
    template === 'cobalt' || template === 'bold'
      ? 'cobalt'
      : template === 'dark' || template === 'minimal'
        ? 'dark'
        : 'warm';
  const initials = (creator.displayName || creator.username || 'F')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const palette =
    variant === 'cobalt'
      ? {
          scene: '#101A38',
          tile: 'rgba(255,255,255,0.055)',
          glow: 'radial-gradient(ellipse at 50% 42%, rgba(99,130,255,0.34) 0%, transparent 60%)',
          card: '#1B2548',
          imageFallback: 'linear-gradient(155deg, #8fa5f7, #3B5FDB)',
          watermark: '#7b96f5',
          name: '#E8EEFF',
          bio: '#6B7BAD',
          stat: '#7B8DC4',
          cta: '#3B5FDB',
          urlChip: 'linear-gradient(135deg, #3B5FDB, #7b96f5)',
        }
      : variant === 'dark'
        ? {
            scene: '#0E0905',
            tile: 'rgba(249,115,22,0.07)',
            glow: 'radial-gradient(ellipse at 50% 42%, rgba(249,115,22,0.24) 0%, transparent 58%)',
            card: '#191009',
            imageFallback: 'linear-gradient(155deg, #5c2a0a, #F97316)',
            watermark: '#F97316',
            name: '#F5F0E8',
            bio: '#6B5E52',
            stat: '#7A6A5E',
            cta: '#F97316',
            urlChip: 'linear-gradient(135deg, #7c3a0e, #F97316)',
          }
        : {
            scene: '#F0E9DC',
            tile: 'rgba(249,115,22,0.11)',
            glow: 'radial-gradient(ellipse at 50% 58%, rgba(249,115,22,0.2) 0%, transparent 65%)',
            card: '#272018',
            imageFallback: 'linear-gradient(155deg, #f5c49c, #F97316)',
            watermark: '#F97316',
            name: '#F5F0E8',
            bio: '#7A6A5E',
            stat: '#9E8E82',
            cta: '#F97316',
            urlChip: 'linear-gradient(135deg, #F97316, #fb923c)',
          };

  return (
    <div className="overflow-hidden rounded-2xl bg-background">
      <div
        style={{
          width: cardWidth,
          height: cardHeight,
          transform: `scale(${cardScale})`,
          transformOrigin: 'top left',
          marginBottom: -(cardHeight * (1 - cardScale)),
        }}
      >
        <div
          style={{
            width: cardWidth,
            height: cardHeight,
            background: '#EDEAE3',
            fontFamily: 'DM Sans, sans-serif',
            position: 'relative',
            overflow: 'hidden',
            padding: '86px 84px',
          }}
        >
          <div
            style={{
              width: 912,
              height: 1525,
              margin: '0 auto',
              borderRadius: 140,
              overflow: 'hidden',
              position: 'relative',
              background: palette.scene,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {[-1, 0, 1, 2, 3, 4].map((n) => (
              <div
                key={`tile-${n}`}
                style={{
                  position: 'absolute',
                  top: 120 + n * 250,
                  left: n % 2 === 0 ? -120 : 190,
                  fontFamily: 'Syne, DM Sans, sans-serif',
                  fontWeight: 800,
                  fontSize: 180,
                  letterSpacing: -8,
                  transform: 'rotate(-18deg)',
                  color: palette.tile,
                  userSelect: 'none',
                }}
              >
                foleio.
              </div>
            ))}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: palette.glow,
              }}
            />

            <div
              style={{
                position: 'relative',
                zIndex: 2,
                width: 770,
                borderRadius: 82,
                overflow: 'hidden',
                background: palette.card,
                boxShadow:
                  '0 8px 0 rgba(255,255,255,0.06) inset, 0 28px 64px rgba(0,0,0,0.22), 0 80px 160px rgba(0,0,0,0.24)',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 850,
                  overflow: 'hidden',
                  background: palette.imageFallback,
                }}
              >
                {creator.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'Syne, DM Sans, sans-serif',
                      fontSize: 220,
                      fontWeight: 800,
                      letterSpacing: -10,
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    {initials || 'F'}
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    top: 36,
                    right: 36,
                    color: palette.watermark,
                    fontFamily: 'Syne, DM Sans, sans-serif',
                    fontSize: 32,
                    fontWeight: 800,
                    opacity: 0.48,
                  }}
                >
                  foleio.
                </div>
              </div>

              <div style={{ padding: '46px 48px 50px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <p
                    style={{
                      color: palette.name,
                      fontFamily: 'Syne, DM Sans, sans-serif',
                      fontWeight: 800,
                      fontSize: 52,
                      letterSpacing: -1.2,
                      lineHeight: 1,
                    }}
                  >
                    {creator.displayName}
                  </p>
                  <svg width="54" height="54" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L14.3 4.6L17.7 3.8L18.9 7.1L22 8.7L20.8 12L22 15.3L18.9 16.9L17.7 20.2L14.3 19.4L12 22L9.7 19.4L6.3 20.2L5.1 16.9L2 15.3L3.2 12L2 8.7L5.1 7.1L6.3 3.8L9.7 4.6L12 2Z"
                      fill="#F97316"
                    />
                    <path
                      d="M8 12.5L10.5 15L16 9.5"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <p
                  style={{
                    marginTop: 16,
                    fontSize: 35,
                    lineHeight: 1.45,
                    color: palette.bio,
                    minHeight: 132,
                  }}
                >
                  {creator.bio ||
                    "Nigeria's go-to creator on Foleio. Turning followers into a real community."}
                </p>

                <div
                  style={{
                    marginTop: 34,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 30, color: palette.stat }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 32, fontWeight: 600 }}>
                      <span>👥</span>
                      <span>312</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 32, fontWeight: 600 }}>
                      <span>▶</span>
                      <span>48</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      borderRadius: 999,
                      background: palette.cta,
                      color: '#fff',
                      padding: '16px 28px',
                      fontSize: 30,
                      fontWeight: 700,
                    }}
                  >
                    Say Hi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
