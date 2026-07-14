'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeBookingDate(value: string | Date) {
  if (typeof value === 'string') return value.slice(0, 10);
  return toDateKey(new Date(value));
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ key: string; day: number } | null> = [];

  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ key: toDateKey(new Date(year, month, day)), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface UpcomingBookingsCalendarProps {
  bookingDates: Array<string | Date>;
  selectedDate: string | null;
  onSelectDate: (dateKey: string | null) => void;
}

export function UpcomingBookingsCalendar({
  bookingDates,
  selectedDate,
  onSelectDate,
}: UpcomingBookingsCalendarProps) {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const bookedKeys = useMemo(() => {
    const set = new Set<string>();
    bookingDates.forEach((date) => set.add(normalizeBookingDate(date)));
    return set;
  }, [bookingDates]);

  const initialMonth = useMemo(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    const sorted = Array.from(bookedKeys).sort();
    if (sorted.length > 0) {
      const [y, m] = sorted[0].split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }, [bookedKeys, selectedDate]);

  const [monthCursor, setMonthCursor] = useState(initialMonth);
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const monthLabel = monthCursor.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) => {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <div className="foleio-avail-card foleio-avail-calendar" style={{ marginBottom: 12 }}>
      <div className="foleio-avail-cal-header">
        <button
          type="button"
          className="foleio-avail-cal-nav"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <h3 className="foleio-avail-cal-month">{monthLabel}</h3>
        <button
          type="button"
          className="foleio-avail-cal-nav"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="foleio-avail-cal-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="foleio-avail-cal-grid">
        {cells.map((cell, index) => {
          if (!cell) {
            return <span key={`pad-${index}`} className="foleio-avail-cal-pad" />;
          }

          const booked = bookedKeys.has(cell.key);
          const selected = selectedDate === cell.key;
          const isToday = cell.key === todayKey;

          return (
            <button
              key={cell.key}
              type="button"
              className={[
                'foleio-avail-cal-day',
                booked ? 'is-booked' : '',
                selected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(selected ? null : cell.key)}
              aria-pressed={selected}
              aria-label={`${cell.key}${booked ? ', has booking' : ''}${selected ? ', selected' : ''}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className="foleio-avail-legend">
        <span>
          <span className="foleio-avail-legend-dot is-booked" aria-hidden />
          Has booking
        </span>
        <span>
          <span className="foleio-avail-legend-dot is-selected" aria-hidden />
          Selected
        </span>
        {selectedDate ? (
          <button
            type="button"
            className="foleio-dash-btn-ghost"
            style={{ height: 28, padding: '0 10px', fontSize: 12 }}
            onClick={() => onSelectDate(null)}
          >
            Show all
          </button>
        ) : null}
      </div>
    </div>
  );
}

export { normalizeBookingDate };
