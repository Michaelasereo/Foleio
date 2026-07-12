import Link from 'next/link';

export function TryFoleioFab() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
.foleio-try-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 50;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: #adadad;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
  box-shadow: none;
}
.foleio-try-fab:hover {
  color: #f4f4f5;
}
`,
        }}
      />
      <Link href="/signup" className="foleio-try-fab">
        Try Foleio today!
      </Link>
    </>
  );
}
