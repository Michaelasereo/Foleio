export default function DashboardLoading() {
  return (
    <div className="foleio-dash-loading" aria-busy="true" aria-label="Loading dashboard">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.foleio-dash-loading {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.foleio-dash-loading-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.foleio-dash-loading-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.foleio-dash-loading-card,
.foleio-dash-loading-panel {
  background: #ffffff;
  border: 1px solid rgba(17, 24, 39, 0.08);
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

      <div className="foleio-dash-loading-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <div className="foleio-dash-loading-bar" style={{ height: 28, width: '55%', maxWidth: 280 }} />
          <div className="foleio-dash-loading-bar" style={{ height: 12, width: '35%', maxWidth: 160 }} />
        </div>
        <div className="foleio-dash-loading-bar" style={{ height: 40, width: 140, borderRadius: 9 }} />
      </div>

      <div className="foleio-dash-loading-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="foleio-dash-loading-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="foleio-dash-loading-bar" style={{ height: 12, width: '42%' }} />
              <div className="foleio-dash-loading-bar" style={{ height: 14, width: 14, borderRadius: 4 }} />
            </div>
            <div className="foleio-dash-loading-bar" style={{ height: 22, width: '58%' }} />
            <div className="foleio-dash-loading-bar" style={{ height: 10, width: '36%' }} />
          </div>
        ))}
      </div>

      <div className="foleio-dash-loading-panel">
        <div className="foleio-dash-loading-bar" style={{ height: 16, width: '48%', maxWidth: 220 }} />
        <div className="foleio-dash-loading-bar" style={{ height: 12, width: '32%', maxWidth: 160 }} />
        <div
          className="foleio-dash-loading-bar"
          style={{ height: 1, width: '100%', marginTop: 4, background: 'rgba(17, 24, 39, 0.08)' }}
        />
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '6px 0',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <div className="foleio-dash-loading-bar" style={{ height: 14, width: '45%' }} />
              <div className="foleio-dash-loading-bar" style={{ height: 22, width: 72, borderRadius: 6 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <div className="foleio-dash-loading-bar" style={{ height: 12, width: 72 }} />
              <div className="foleio-dash-loading-bar" style={{ height: 14, width: 56 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
