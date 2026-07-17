export default function PublicCreatorLoading() {
  return (
    <div
      className="foleio-public-loading"
      aria-busy="true"
      aria-label="Loading creator profile"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
.foleio-public-loading {
  min-height: 100vh;
  width: 100%;
  background: #1a1816;
  box-sizing: border-box;
}
.foleio-public-loading-inner {
  width: 100%;
  max-width: 929px;
  margin: 0 auto;
  padding: 18px 24px 48px;
  box-sizing: border-box;
}
.foleio-public-loading-bar {
  border-radius: 6px;
  background: #2c2c2c;
  animation: foleio-public-load-pulse 1.4s ease-in-out infinite;
}
@keyframes foleio-public-load-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
.foleio-public-loading-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}
@media (min-width: 900px) {
  .foleio-public-loading-grid {
    grid-template-columns: minmax(240px, 333px) minmax(0, 542px);
    gap: clamp(24px, 4vw, 54px);
  }
}
`,
        }}
      />

      <div className="foleio-public-loading-inner">
        <div className="foleio-public-loading-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              className="foleio-public-loading-bar"
              style={{ height: 160, width: '100%', borderRadius: 12 }}
            />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                className="foleio-public-loading-bar"
                style={{ height: 42, width: 42, borderRadius: 999 }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="foleio-public-loading-bar" style={{ height: 18, width: '70%' }} />
                <div className="foleio-public-loading-bar" style={{ height: 12, width: '40%' }} />
              </div>
            </div>
            <div
              className="foleio-public-loading-bar"
              style={{ height: 48, width: '100%', borderRadius: 999 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              className="foleio-public-loading-bar"
              style={{ height: 160, width: '100%', borderRadius: 12 }}
            />
            <div
              className="foleio-public-loading-bar"
              style={{ height: 220, width: '100%', borderRadius: 12 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
