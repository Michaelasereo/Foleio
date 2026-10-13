'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type ShopSearchSelectProps = {
  value: string;
  options: string[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
};

export function ShopSearchSelect({
  value,
  options,
  placeholder,
  searchPlaceholder = 'Search',
  disabled = false,
  required = false,
  onChange,
}: ShopSearchSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuBox, setMenuBox] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
  } | null>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
      setMenuBox({
        left: rect.left,
        width: rect.width,
        top: openUp ? undefined : rect.bottom + 6,
        bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      });
    }
    place();
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <div className="foleio-shop-select" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="foleio-shop-field foleio-shop-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
          setQuery('');
        }}
      >
        <span style={{ color: value ? '#f4f4f5' : 'rgba(250,250,250,0.68)' }}>
          {value || placeholder}
        </span>
        <ChevronDown strokeWidth={1.75} style={{ width: 16, height: 16, flexShrink: 0 }} />
      </button>
      {open && menuBox
        ? createPortal(
            <div
              ref={menuRef}
              className="foleio-shop-select-menu"
              id={listId}
              role="listbox"
              style={{
                left: menuBox.left,
                width: menuBox.width,
                top: menuBox.top,
                bottom: menuBox.bottom,
              }}
            >
              <input
                ref={searchRef}
                className="foleio-shop-field"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {matches.length === 0 ? (
                <p className="foleio-shop-select-empty">No matches</p>
              ) : (
                matches.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={option === value}
                    className={
                      option === value
                        ? 'foleio-shop-select-option is-active'
                        : 'foleio-shop-select-option'
                    }
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    {option}
                  </button>
                ))
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
