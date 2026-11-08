export default function ProfilePreviewLoading() {
  return (
    <div className="foleio-preview-page" aria-busy="true" aria-label="Loading preview">
      <style
        dangerouslySetInnerHTML={{
          __html: `
body:has(.foleio-preview-page) { background: #141414; }
body:has(.foleio-preview-page) footer { display: none !important; }
.foleio-preview-page {
  height: 100dvh;
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  background: #141414;
  overflow: hidden;
}
.foleio-preview-side {
  padding: 20px 16px;
  background: #1a1816;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}
.foleio-preview-stage { min-width: 0; padding: 14px 16px 16px; }
.foleio-preview-bar {
  border-radius: 10px;
  background: #2b2b2b;
  animation: foleio-preview-pulse 1.4s ease-in-out infinite;
}
@keyframes foleio-preview-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
.foleio-preview-frame {
  height: calc(100dvh - 78px);
  margin-top: 14px;
  border-radius: 16px;
  background: #1a1816;
}
@media (max-width: 800px) {
  .foleio-preview-page { grid-template-columns: 1fr; height: auto; min-height: 100dvh; }
  .foleio-preview-frame { height: 70vh; }
}
`,
        }}
      />
      <aside className="foleio-preview-side">
        <div className="foleio-preview-bar" style={{ height: 40, width: 210, borderRadius: 10, background: '#f4f4f5' }} />
        <div className="foleio-preview-bar" style={{ height: 28, width: '70%', marginTop: 16 }} />
        <div className="foleio-preview-bar" style={{ height: 12, width: '46%', marginTop: 10 }} />
        <div className="foleio-preview-bar" style={{ height: 120, marginTop: 18 }} />
        <div className="foleio-preview-bar" style={{ height: 88, marginTop: 12 }} />
        <div className="foleio-preview-bar" style={{ height: 180, marginTop: 12 }} />
      </aside>
      <section className="foleio-preview-stage">
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="foleio-preview-bar" style={{ height: 34, width: 84, borderRadius: 999 }} />
          <div className="foleio-preview-bar" style={{ height: 34, width: 84, borderRadius: 999 }} />
          <div className="foleio-preview-bar" style={{ height: 34, width: 72, borderRadius: 999 }} />
        </div>
        <div className="foleio-preview-frame" />
      </section>
    </div>
  );
}
