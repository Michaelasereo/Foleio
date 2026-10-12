'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

const BOOKINGS = [
  {
    date: '2026-11-14',
    service: 'Bridal makeup',
    client: 'Chiamaka E.',
    cost: '₦80,000',
    note: 'Deposit paid ₦40,000',
  },
  {
    date: '2026-11-15',
    service: 'Soft glam',
    client: 'Tolu A.',
    cost: '₦35,000',
    note: 'Paid in full',
  },
  {
    date: '2026-11-18',
    service: 'Bridal trial',
    client: 'Halima B.',
    cost: '₦25,000',
    note: 'Paid in full',
  },
] as const;

function monthCells(year: number, month: number) {
  const startPad = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number; key: string } | null> = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= days; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ day, key });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatDate(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

export function BookingsPreview() {
  const [cursor, setCursor] = useState(() => new Date(2026, 10, 1));
  const [selected, setSelected] = useState('2026-11-14');
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const booked = useMemo(() => new Map(BOOKINGS.map((item) => [item.date, item])), []);
  const current = booked.get(selected);
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-[28px] bg-[#f3f1ec] p-3 sm:p-4">
      <div className="rounded-[22px] bg-white p-4 shadow-[0_16px_40px_-28px_rgba(28,27,25,0.45)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#3b3a36] hover:bg-[#f3f1ec]"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <p className="text-[15px] font-semibold tracking-[-0.02em]">{monthLabel}</p>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#3b3a36] hover:bg-[#f3f1ec]"
            aria-label="Next month"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-medium text-[#8a877f]">
          {WEEKDAYS.map((label) => (
            <span key={label} className="py-1">
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 text-center">
          {cells.map((cell, index) => {
            if (!cell) return <span key={`pad-${index}`} />;
            const hasBooking = booked.has(cell.key);
            const isSelected = selected === cell.key;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelected(cell.key)}
                aria-pressed={isSelected}
                className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[13px] ${
                  isSelected
                    ? 'bg-[#1c1b19] font-semibold text-white'
                    : hasBooking
                      ? 'font-medium text-[#1c1b19]'
                      : 'text-[#3b3a36]'
                }`}
              >
                {cell.day}
                {hasBooking && !isSelected ? (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#1c1b19]" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 border-t border-[#f3f1ec] pt-4">
          <p className="text-[13px] text-[#6b6a64]">{formatDate(selected)}</p>
          {current ? (
            <div className="mt-2 flex items-start justify-between gap-4">
              <div>
                <p className="text-[15px] font-semibold tracking-[-0.02em]">{current.service}</p>
                <p className="mt-0.5 text-[13px] text-[#8a877f]">
                  {current.client} · {current.note}
                </p>
              </div>
              <p className="shrink-0 text-[15px] font-semibold">{current.cost}</p>
            </div>
          ) : (
            <p className="mt-2 text-[14px] text-[#8a877f]">No booking on this date.</p>
          )}
        </div>
      </div>
    </div>
  );
}
