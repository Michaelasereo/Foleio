'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

export function FieldInfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      tabIndex={0}
      aria-label={text}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        color: '#828282',
        cursor: 'default',
        outline: 'none',
      }}
    >
      <Info className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      {open ? (
        <span
          role="tooltip"
          className="foleio-dash-panel-meta"
          style={{
            position: 'absolute',
            left: 0,
            bottom: 'calc(100% + 8px)',
            zIndex: 40,
            width: 220,
            margin: 0,
            padding: '8px 10px',
            borderRadius: 8,
            background: '#ffffff',
            border: '1px solid rgba(17, 24, 39, 0.12)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
            whiteSpace: 'normal',
          }}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
