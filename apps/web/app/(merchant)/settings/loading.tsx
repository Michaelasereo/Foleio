export default function SettingsLoading() {
  return (
    <div className="foleio-dash-loading" aria-busy="true" aria-label="Loading settings">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.foleio-dash-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.foleio-dash-loading-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.foleio-dash-loading-pills {
  display: flex;
  gap: 4px;
  padding: 3px;
  background: #f5f5f4;
  border-radius: 999px;
}
.foleio-dash-loading-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 900px) {
  .foleio-dash-loading-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
.foleio-dash-loading-panel {
  background: #ffffff;
  border: 1px solid #e7e5e4;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.foleio-dash-loading-bar {
  border-radius: 8px;
  background: #ebe8eb;
  animation: foleio-dash-pulse 1.4s ease-in-out infinite;
}
@keyframes foleio-dash-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
`,
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="foleio-dash-loading-bar" style={{ height: 32, width: 220 }} />
        <div className="foleio-dash-loading-bar" style={{ height: 14, width: 280 }} />
      </div>

      <div className="foleio-dash-loading-tabs">
        <div className="foleio-dash-loading-pills">
          {['Profile', 'Portfolio', 'Reviews', 'Billing'].map((label, index) => (
            <div
              key={label}
              className="foleio-dash-loading-bar"
              style={{
                height: 34,
                width: index === 0 ? 84 : 96,
                borderRadius: 999,
                background: index === 0 ? '#ffffff' : 'transparent',
              }}
            />
          ))}
        </div>
        <div className="foleio-dash-loading-bar" style={{ height: 34, width: 168, borderRadius: 8, background: '#111827' }} />
      </div>

      <div className="foleio-dash-loading-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="foleio-dash-loading-panel">
            <div className="foleio-dash-loading-bar" style={{ height: 16, width: '40%' }} />
            <div className="foleio-dash-loading-bar" style={{ height: 180, width: '100%', borderRadius: 12 }} />
          </div>
          <div className="foleio-dash-loading-panel">
            <div className="foleio-dash-loading-bar" style={{ height: 16, width: '36%' }} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="foleio-dash-loading-bar" style={{ height: 64, width: 64, borderRadius: 999 }} />
              <div className="foleio-dash-loading-bar" style={{ height: 14, width: '46%' }} />
            </div>
          </div>
        </div>
        <div className="foleio-dash-loading-panel">
          <div className="foleio-dash-loading-bar" style={{ height: 16, width: '42%' }} />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="foleio-dash-loading-bar" style={{ height: 12, width: '28%' }} />
              <div className="foleio-dash-loading-bar" style={{ height: 42, width: '100%', borderRadius: 10 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
