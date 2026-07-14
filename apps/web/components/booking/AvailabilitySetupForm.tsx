'use client';

import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
} from 'lucide-react';

interface AvailabilityItem {
  id: string;
  date: string | Date;
  isAvailable: boolean;
  maxBookings?: number | null;
}

interface AvailabilitySetupFormProps {
  creatorId: string;
  availability: AvailabilityItem[];
}

type TimeMode = 'full' | 'hours';

interface DaySchedule {
  timeMode: TimeMode;
  startTime: string;
  endTime: string;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

const DEFAULT_AVAILABLE: DaySchedule = {
  timeMode: 'full',
  startTime: '09:00',
  endTime: '17:00',
};

const DEFAULT_OFF: DaySchedule = {
  timeMode: 'full',
  startTime: '09:00',
  endTime: '17:00',
};

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

function formatChipDate(dateStr: string) {
  if (!dateStr) return 'Select date';
  return parseDateKey(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function normalizeItemDate(value: string | Date) {
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

export function AvailabilitySetupForm({
  availability: initialAvailability,
}: AvailabilitySetupFormProps) {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const todayDate = useMemo(() => parseDateKey(todayKey), [todayKey]);

  const initialSelected = useMemo(() => {
    const set = new Set<string>();
    initialAvailability.forEach((item) => {
      if (item.isAvailable) set.add(normalizeItemDate(item.date));
    });
    return set;
  }, [initialAvailability]);

  const initialOff = useMemo(() => {
    const set = new Set<string>();
    initialAvailability.forEach((item) => {
      if (!item.isAvailable) set.add(normalizeItemDate(item.date));
    });
    return set;
  }, [initialAvailability]);

  const [viewMonth, setViewMonth] = useState(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  );
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(initialSelected)
  );
  const [offDates, setOffDates] = useState<Set<string>>(() => new Set(initialOff));
  const [dateSchedules, setDateSchedules] = useState<Record<string, DaySchedule>>({});
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [isAvailableMode, setIsAvailableMode] = useState(false);
  const [availableSchedule, setAvailableSchedule] =
    useState<DaySchedule>(DEFAULT_AVAILABLE);
  const [offSchedule, setOffSchedule] = useState<DaySchedule>(DEFAULT_OFF);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'ok' | 'err'>('ok');

  const activeSchedule = isAvailableMode ? availableSchedule : offSchedule;
  const setActiveSchedule = isAvailableMode ? setAvailableSchedule : setOffSchedule;

  const timezoneLabel = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZoneName: 'shortOffset',
      }).formatToParts(new Date());
      const offset = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';
      return { offset, city: 'Lagos' };
    } catch {
      return { offset: 'GMT+01:00', city: 'Lagos' };
    }
  }, []);

  const monthLabel = viewMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const cells = useMemo(
    () => buildMonthCells(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );

  const isPast = (key: string) => key < todayKey;

  const applyStatusToDate = (key: string, makeAvailable: boolean, schedule: DaySchedule) => {
    if (makeAvailable) {
      setSelectedDates((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      setOffDates((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      setOffDates((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      setSelectedDates((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
    setDateSchedules((prev) => ({ ...prev, [key]: { ...schedule } }));
  };

  const handleDayClick = (key: string) => {
    if (isPast(key)) return;

    setActiveDate(key);

    const existing = dateSchedules[key];
    const isOff = offDates.has(key);
    const isAvailable = selectedDates.has(key);

    if (isAvailable) {
      setIsAvailableMode(true);
      setAvailableSchedule(existing || DEFAULT_AVAILABLE);
      return;
    }

    if (isOff) {
      setIsAvailableMode(false);
      setOffSchedule(existing || DEFAULT_OFF);
      return;
    }

    // Fresh date — default Off; user can toggle Available on
    setIsAvailableMode(false);
    const schedule = { ...offSchedule };
    applyStatusToDate(key, false, schedule);
  };

  const handleAvailabilityToggle = () => {
    const nextMode = !isAvailableMode;
    setIsAvailableMode(nextMode);
    if (!activeDate) return;
    const schedule = nextMode ? { ...availableSchedule } : { ...offSchedule };
    applyStatusToDate(activeDate, nextMode, schedule);
  };

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const updateTimeMode = (timeMode: TimeMode) => {
    setActiveSchedule((prev) => {
      const next = { ...prev, timeMode };
      if (activeDate) {
        setDateSchedules((schedules) => ({ ...schedules, [activeDate]: next }));
      }
      return next;
    });
  };

  const updateTime = (field: 'startTime' | 'endTime', value: string) => {
    setActiveSchedule((prev) => {
      const next = { ...prev, [field]: value };
      if (activeDate) {
        setDateSchedules((schedules) => ({ ...schedules, [activeDate]: next }));
      }
      return next;
    });
  };

  const handleSave = async () => {
    const available = Array.from(selectedDates).filter((key) => !isPast(key));
    const unavailable = Array.from(offDates).filter((key) => !isPast(key));

    if (available.length === 0 && unavailable.length === 0) {
      setMessageTone('err');
      setMessage('Select at least one date on the calendar.');
      return;
    }

    if (
      (isAvailableMode &&
        availableSchedule.timeMode === 'hours' &&
        availableSchedule.startTime >= availableSchedule.endTime) ||
      (!isAvailableMode &&
        offSchedule.timeMode === 'hours' &&
        offSchedule.startTime >= offSchedule.endTime)
    ) {
      setMessageTone('err');
      setMessage('End time must be after start time.');
      return;
    }

    setIsSaving(true);
    setMessage('');
    try {
      const requests: Promise<Response>[] = [];

      if (available.length > 0) {
        requests.push(
          fetch('/api/availability/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dates: available,
              isAvailable: true,
              maxBookings: 1,
            }),
          })
        );
      }

      if (unavailable.length > 0) {
        requests.push(
          fetch('/api/availability/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dates: unavailable,
              isAvailable: false,
              maxBookings: null,
            }),
          })
        );
      }

      const responses = await Promise.all(requests);
      for (const response of responses) {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || 'Failed to save availability');
        }
      }

      setMessageTone('ok');
      setMessage(
        [
          available.length ? `${available.length} available` : null,
          unavailable.length ? `${unavailable.length} off` : null,
        ]
          .filter(Boolean)
          .join(' · ') + ' saved'
      );
    } catch (error: any) {
      setMessageTone('err');
      setMessage(error?.message || 'Could not save availability');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="foleio-avail">
      <div className="foleio-avail-toolbar">
        <div className="foleio-avail-tz">
          <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>{timezoneLabel.offset}</span>
          <span className="foleio-avail-tz-sep" aria-hidden>
            ·
          </span>
          <span>{timezoneLabel.city}</span>
        </div>
      </div>

      <h2 className="foleio-avail-title">Availability management</h2>

      <div className="foleio-avail-card foleio-avail-calendar">
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

            const past = isPast(cell.key);
            const off = offDates.has(cell.key);
            const selected = selectedDates.has(cell.key);
            const isToday = cell.key === todayKey;
            const isActive = activeDate === cell.key;

            return (
              <button
                key={cell.key}
                type="button"
                className={[
                  'foleio-avail-cal-day',
                  selected ? 'is-selected' : '',
                  off ? 'is-off' : '',
                  past ? 'is-past' : '',
                  isToday ? 'is-today' : '',
                  isActive ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={past}
                onClick={() => handleDayClick(cell.key)}
                aria-pressed={selected || off}
                aria-current={isActive ? 'date' : undefined}
                aria-label={`${formatChipDate(cell.key)}${off ? ', off day' : ''}${selected ? ', available' : ''}`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <div className="foleio-avail-legend">
          <span>
            <i className="foleio-avail-legend-dot is-selected" /> Available
          </span>
          <span>
            <i className="foleio-avail-legend-dot is-off" /> Off day
          </span>
          <span>
            <i className="foleio-avail-legend-dot is-past" /> Past
          </span>
        </div>
      </div>

      {activeDate ? (
        <div className="foleio-avail-card foleio-avail-mgmt">
          <p className="foleio-avail-mgmt-date">{formatChipDate(activeDate)}</p>
          <div className="foleio-avail-mgmt-row">
            <div className="foleio-avail-mgmt-copy">
              <p className="foleio-avail-mgmt-label">Available</p>
              <p className="foleio-avail-mgmt-hint">
                {isAvailableMode
                  ? 'This date is bookable'
                  : 'Off by default — toggle on to make it available'}
              </p>
            </div>
            <button
              type="button"
              className={`foleio-avail-toggle${isAvailableMode ? ' is-on' : ''}`}
              onClick={handleAvailabilityToggle}
              aria-pressed={isAvailableMode}
              aria-label={isAvailableMode ? 'Available' : 'Off'}
            >
              <span />
            </button>
          </div>

          <div className="foleio-avail-time-block">
            <p className="foleio-avail-mgmt-label">Time</p>
            <div className="foleio-avail-time-modes">
              <button
                type="button"
                className={`foleio-avail-time-mode${activeSchedule.timeMode === 'full' ? ' is-active' : ''}`}
                onClick={() => updateTimeMode('full')}
              >
                Full day
              </button>
              <button
                type="button"
                className={`foleio-avail-time-mode${activeSchedule.timeMode === 'hours' ? ' is-active' : ''}`}
                onClick={() => updateTimeMode('hours')}
              >
                Hours
              </button>
            </div>

            {activeSchedule.timeMode === 'hours' ? (
              <div className="foleio-avail-time-range">
                <label className="foleio-avail-time-field">
                  <span>From</span>
                  <input
                    type="time"
                    value={activeSchedule.startTime}
                    onChange={(e) => updateTime('startTime', e.target.value)}
                  />
                </label>
                <span className="foleio-avail-time-to">to</span>
                <label className="foleio-avail-time-field">
                  <span>To</span>
                  <input
                    type="time"
                    value={activeSchedule.endTime}
                    onChange={(e) => updateTime('endTime', e.target.value)}
                  />
                </label>
              </div>
            ) : (
              <p className="foleio-avail-time-full-hint">
                {isAvailableMode
                  ? 'This date will be open all day'
                  : 'This date will be off all day'}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="foleio-avail-pick-hint">Click a date to set availability</p>
      )}

      <button
        type="button"
        className="foleio-avail-submit"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            Saving...
          </>
        ) : (
          'Save availability'
        )}
      </button>

      {message ? (
        <p className={`foleio-avail-message ${messageTone === 'err' ? 'is-err' : 'is-ok'}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
