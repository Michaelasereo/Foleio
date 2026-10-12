'use client';

import type { ReactNode } from 'react';

type RightSideDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  busy?: boolean;
  children: ReactNode;
};

export function RightSideDrawer({
  open,
  onClose,
  title,
  description,
  busy = false,
  children,
}: RightSideDrawerProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="foleio-dash-panel"
        style={{
          width: 'min(460px, 100vw)',
          height: '100%',
          borderRadius: 0,
          overflowY: 'auto',
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="foleio-dash-panel-title" style={{ marginBottom: 8 }}>
          {title}
        </h3>
        {description ? (
          <p className="foleio-dash-panel-meta" style={{ marginBottom: 16 }}>
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
