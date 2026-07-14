export default function SettingsLoading() {
  return (
    <div className="foleio-dash-loading" aria-busy="true" aria-label="Loading settings">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.foleio-dash-loading {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.foleio-dash-loading-panel {
  background: #212121;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.foleio-dash-loading-tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: #212121;
  border-radius: 10px;
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
        <div className="foleio-dash-loading-bar" style={{ height: 28, width: '40%', maxWidth: 160 }} />
        <div className="foleio-dash-loading-bar" style={{ height: 12, width: '55%', maxWidth: 260 }} />
      </div>

      <div className="foleio-dash-loading-tabs">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="foleio-dash-loading-bar"
            style={{ height: 34, width: i === 0 ? 72 : 110, borderRadius: 8 }}
          />
        ))}
      </div>

      <div className="foleio-dash-loading-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            className="foleio-dash-loading-bar"
            style={{ height: 72, width: 72, borderRadius: 999 }}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="foleio-dash-loading-bar" style={{ height: 14, width: '36%' }} />
            <div className="foleio-dash-loading-bar" style={{ height: 12, width: '52%' }} />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <div className="foleio-dash-loading-bar" style={{ height: 12, width: '22%' }} />
            <div className="foleio-dash-loading-bar" style={{ height: 42, width: '100%', borderRadius: 10 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
