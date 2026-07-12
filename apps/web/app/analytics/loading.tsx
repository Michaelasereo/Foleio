export default function AnalyticsLoading() {
  return (
    <div className="foleio-dash-loading" aria-busy="true" aria-label="Loading analytics">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.foleio-dash-loading {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.foleio-dash-loading-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.foleio-dash-loading-card,
.foleio-dash-loading-panel {
  background: #212121;
  border-radius: 10px;
}
.foleio-dash-loading-card {
  min-height: 88px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.foleio-dash-loading-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.foleio-dash-loading-bar {
  border-radius: 6px;
  background: #2c2c2c;
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
        <div className="foleio-dash-loading-bar" style={{ height: 28, width: '42%', maxWidth: 200 }} />
        <div className="foleio-dash-loading-bar" style={{ height: 12, width: '55%', maxWidth: 260 }} />
      </div>

      <div className="foleio-dash-loading-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="foleio-dash-loading-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="foleio-dash-loading-bar" style={{ height: 12, width: '42%' }} />
              <div className="foleio-dash-loading-bar" style={{ height: 14, width: 14, borderRadius: 4 }} />
            </div>
            <div className="foleio-dash-loading-bar" style={{ height: 22, width: '48%' }} />
            <div className="foleio-dash-loading-bar" style={{ height: 10, width: '36%' }} />
          </div>
        ))}
      </div>

      <div className="foleio-dash-loading-panel">
        <div className="foleio-dash-loading-bar" style={{ height: 16, width: '40%', maxWidth: 180 }} />
        <div className="foleio-dash-loading-bar" style={{ height: 12, width: '28%', maxWidth: 120 }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              paddingTop: 8,
              borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="foleio-dash-loading-bar" style={{ height: 14, width: '52%' }} />
              <div className="foleio-dash-loading-bar" style={{ height: 12, width: '34%' }} />
            </div>
            <div className="foleio-dash-loading-bar" style={{ height: 14, width: 64 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
