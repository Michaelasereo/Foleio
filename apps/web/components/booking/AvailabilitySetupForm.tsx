'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  formatSlotLabel,
  generateHourlySlots,
  mergeWithCustom,
  parseHHmmTo12,
  toHHmmFrom12,
  type AmPm,
  type ClockParts12,
  type TimeRange,
} from '@/lib/booking/slots';

interface AvailabilityItem {
  id: string;
  date: string | Date;
  isAvailable: boolean;
  maxBookings?: number | null;
  mode?: 'full_day' | 'hours';
  startTime?: string | null;
  endTime?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  slotIntervalMinutes?: number | null;
  customSlots?: TimeRange[];
  disabledGeneratedStarts?: string[];
}

interface AvailabilitySetupFormProps {
  creatorId: string;
  availability: AvailabilityItem[];
}

type TimeMode = 'full' | 'hours';
type SlotInterval = 60 | 90;

interface DaySchedule {
  timeMode: TimeMode;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: SlotInterval;
  customSlots: TimeRange[];
  disabledGeneratedStarts: string[];
}

interface ScheduleTemplate {
  id: string;
  name: string;
  mode: string;
  startTime: string | null;
  endTime: string | null;
  slotIntervalMinutes?: number | null;
  customSlots: TimeRange[];
  disabledGeneratedStarts: string[];
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function normalizeSlotInterval(value: unknown): SlotInterval {
  return Number(value) === 90 ? 90 : 60;
}

const DEFAULT_AVAILABLE: DaySchedule = {
  timeMode: 'full',
  startTime: '09:00',
  endTime: '17:00',
  slotIntervalMinutes: 60,
  customSlots: [],
  disabledGeneratedStarts: [],
};

const DEFAULT_OFF: DaySchedule = {
  timeMode: 'full',
  startTime: '09:00',
  endTime: '17:00',
  slotIntervalMinutes: 60,
  customSlots: [],
  disabledGeneratedStarts: [],
};

const DEFAULT_HOURS_WINDOW = {
  startTime: '09:00',
  endTime: '17:00',
} as const;

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

function scheduleFromItem(item: AvailabilityItem): DaySchedule {
  return {
    timeMode: item.mode === 'hours' ? 'hours' : 'full',
    startTime: item.startTime || item.windowStart || '',
    endTime: item.endTime || item.windowEnd || '',
    slotIntervalMinutes: normalizeSlotInterval(item.slotIntervalMinutes),
    customSlots: Array.isArray(item.customSlots) ? item.customSlots : [],
    disabledGeneratedStarts: Array.isArray(item.disabledGeneratedStarts)
      ? item.disabledGeneratedStarts
      : [],
  };
}

const DEFAULT_CUSTOM_FROM: ClockParts12 = { hour12: 6, minute: 0, amPm: 'PM' };
const DEFAULT_CUSTOM_TO: ClockParts12 = { hour12: 7, minute: 0, amPm: 'PM' };

function Time12Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ClockParts12;
  onChange: (next: ClockParts12) => void;
}) {
  return (
    <label className="foleio-avail-time-field">
      <span>{label}</span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
        }}
      >
        <input
          className="foleio-dash-input"
          type="number"
          min={1}
          max={12}
          value={value.hour12}
          onChange={(e) => {
            const hour12 = Number(e.target.value);
            onChange({
              ...value,
              hour12: Number.isFinite(hour12) ? hour12 : value.hour12,
            });
          }}
          style={{ width: 56, padding: '6px 8px' }}
          aria-label={`${label} hour`}
        />
        <span style={{ color: '#a1a1aa' }}>:</span>
        <input
          className="foleio-dash-input"
          type="number"
          min={0}
          max={59}
          value={String(value.minute).padStart(2, '0')}
          onChange={(e) => {
            const minute = Number(e.target.value);
            onChange({
              ...value,
              minute: Number.isFinite(minute) ? minute : value.minute,
            });
          }}
          style={{ width: 56, padding: '6px 8px' }}
          aria-label={`${label} minute`}
        />
        <div
          style={{
            display: 'inline-flex',
            borderRadius: 8,
            border: '1px solid #3a3a3a',
            overflow: 'hidden',
          }}
          role="group"
          aria-label={`${label} AM or PM`}
        >
          {(['AM', 'PM'] as AmPm[]).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => onChange({ ...value, amPm: period })}
              style={{
                border: 'none',
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: value.amPm === period ? '#f4f4f5' : 'transparent',
                color: value.amPm === period ? '#111' : '#f4f4f5',
              }}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
    </label>
  );
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

  const initialSchedules = useMemo(() => {
    const map: Record<string, DaySchedule> = {};
    initialAvailability.forEach((item) => {
      map[normalizeItemDate(item.date)] = scheduleFromItem(item);
    });
    return map;
  }, [initialAvailability]);

  const [viewMonth, setViewMonth] = useState(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  );
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(initialSelected)
  );
  const [offDates, setOffDates] = useState<Set<string>>(() => new Set(initialOff));
  const [dateSchedules, setDateSchedules] =
    useState<Record<string, DaySchedule>>(initialSchedules);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [isAvailableMode, setIsAvailableMode] = useState(false);
  const [availableSchedule, setAvailableSchedule] =
    useState<DaySchedule>(DEFAULT_AVAILABLE);
  const [offSchedule, setOffSchedule] = useState<DaySchedule>(DEFAULT_OFF);
  const [customFrom, setCustomFrom] = useState<ClockParts12>(DEFAULT_CUSTOM_FROM);
  const [customTo, setCustomTo] = useState<ClockParts12>(DEFAULT_CUSTOM_TO);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingCustomIndex, setEditingCustomIndex] = useState<number | null>(null);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'ok' | 'err'>('ok');

  const activeSchedule = isAvailableMode ? availableSchedule : offSchedule;
  const setActiveSchedule = isAvailableMode ? setAvailableSchedule : setOffSchedule;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/availability/templates', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.templates)) {
          setTemplates(
            data.templates.map((t: ScheduleTemplate & { customSlots?: unknown }) => ({
              ...t,
              slotIntervalMinutes: normalizeSlotInterval(t.slotIntervalMinutes),
              customSlots: (t.customSlots as TimeRange[]) || [],
              disabledGeneratedStarts: (t.disabledGeneratedStarts as string[]) || [],
            }))
          );
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/availability', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const rows = (data.availability || []) as AvailabilityItem[];
        if (cancelled) return;

        const nextSelected = new Set<string>();
        const nextOff = new Set<string>();
        const nextSchedules: Record<string, DaySchedule> = {};
        for (const item of rows) {
          const key = normalizeItemDate(item.date);
          nextSchedules[key] = scheduleFromItem(item);
          if (item.isAvailable) nextSelected.add(key);
          else nextOff.add(key);
        }
        setSelectedDates(nextSelected);
        setOffDates(nextOff);
        setDateSchedules(nextSchedules);
      } catch {
        // keep SSR props
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const previewSlots = useMemo(() => {
    if (activeSchedule.timeMode !== 'hours') return [];
    const generated =
      activeSchedule.startTime && activeSchedule.endTime
        ? generateHourlySlots(
            activeSchedule.startTime,
            activeSchedule.endTime,
            activeSchedule.slotIntervalMinutes
          )
        : [];
    return mergeWithCustom(
      generated,
      activeSchedule.customSlots,
      activeSchedule.disabledGeneratedStarts
    );
  }, [activeSchedule]);

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

  const syncActiveSchedule = (next: DaySchedule) => {
    setActiveSchedule(next);
    if (activeDate) {
      setDateSchedules((schedules) => ({ ...schedules, [activeDate]: next }));
    }
  };

  const handleDayClick = (key: string) => {
    if (isPast(key)) return;

    setActiveDate(key);
    setShowCustomForm(false);

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
    if (timeMode === 'hours') {
      syncActiveSchedule({
        ...activeSchedule,
        timeMode,
        startTime: activeSchedule.startTime || DEFAULT_HOURS_WINDOW.startTime,
        endTime: activeSchedule.endTime || DEFAULT_HOURS_WINDOW.endTime,
        slotIntervalMinutes: activeSchedule.slotIntervalMinutes || 60,
      });
      return;
    }
    syncActiveSchedule({ ...activeSchedule, timeMode });
  };

  const updateTime = (field: 'startTime' | 'endTime', value: string) => {
    syncActiveSchedule({ ...activeSchedule, [field]: value });
  };

  const updateSlotInterval = (slotIntervalMinutes: SlotInterval) => {
    syncActiveSchedule({
      ...activeSchedule,
      slotIntervalMinutes,
      disabledGeneratedStarts: [],
    });
  };

  const clearDefaultWindow = () => {
    syncActiveSchedule({
      ...activeSchedule,
      startTime: '',
      endTime: '',
      disabledGeneratedStarts: [],
    });
  };

  const restoreDefaultWindow = () => {
    syncActiveSchedule({
      ...activeSchedule,
      startTime: DEFAULT_HOURS_WINDOW.startTime,
      endTime: DEFAULT_HOURS_WINDOW.endTime,
      disabledGeneratedStarts: [],
    });
  };

  const toggleGeneratedSlot = (startTime: string) => {
    const disabled = new Set(activeSchedule.disabledGeneratedStarts);
    if (disabled.has(startTime)) disabled.delete(startTime);
    else disabled.add(startTime);
    syncActiveSchedule({
      ...activeSchedule,
      disabledGeneratedStarts: Array.from(disabled),
    });
  };

  const addCustomSlot = () => {
    const startTime = toHHmmFrom12(customFrom);
    const endTime = toHHmmFrom12(customTo);
    if (startTime >= endTime) {
      setMessageTone('err');
      setMessage('Custom end time must be after start time.');
      return;
    }
    const next =
      editingCustomIndex !== null
        ? activeSchedule.customSlots.map((slot, index) =>
            index === editingCustomIndex ? { startTime, endTime } : slot
          )
        : [...activeSchedule.customSlots, { startTime, endTime }];
    syncActiveSchedule({ ...activeSchedule, customSlots: next });
    setShowCustomForm(false);
    setEditingCustomIndex(null);
    setCustomFrom(DEFAULT_CUSTOM_FROM);
    setCustomTo(DEFAULT_CUSTOM_TO);
    setMessage('');
  };

  const beginEditCustomSlot = (index: number) => {
    const slot = activeSchedule.customSlots[index];
    if (!slot) return;
    setCustomFrom(parseHHmmTo12(slot.startTime));
    setCustomTo(parseHHmmTo12(slot.endTime));
    setEditingCustomIndex(index);
    setShowCustomForm(true);
    setMessage('');
  };

  const removeCustomSlot = (index: number) => {
    syncActiveSchedule({
      ...activeSchedule,
      customSlots: activeSchedule.customSlots.filter((_, i) => i !== index),
    });
    if (editingCustomIndex === index) {
      setShowCustomForm(false);
      setEditingCustomIndex(null);
      setCustomFrom(DEFAULT_CUSTOM_FROM);
      setCustomTo(DEFAULT_CUSTOM_TO);
    } else if (editingCustomIndex !== null && editingCustomIndex > index) {
      setEditingCustomIndex(editingCustomIndex - 1);
    }
  };

  const cancelCustomForm = () => {
    setShowCustomForm(false);
    setEditingCustomIndex(null);
    setCustomFrom(DEFAULT_CUSTOM_FROM);
    setCustomTo(DEFAULT_CUSTOM_TO);
    setMessage('');
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template || !activeDate) return;
    const schedule: DaySchedule = {
      timeMode: template.mode === 'hours' ? 'hours' : 'full',
      startTime: template.startTime || '',
      endTime: template.endTime || '',
      slotIntervalMinutes: normalizeSlotInterval(template.slotIntervalMinutes),
      customSlots: template.customSlots || [],
      disabledGeneratedStarts: template.disabledGeneratedStarts || [],
    };
    setIsAvailableMode(true);
    setAvailableSchedule(schedule);
    applyStatusToDate(activeDate, true, schedule);
    setMessageTone('ok');
    setMessage(`Applied “${template.name}” to ${formatChipDate(activeDate)}`);
  };

  const saveTemplate = async () => {
    const name = templateName.trim();
    if (!name) {
      setMessageTone('err');
      setMessage('Enter a template name.');
      return;
    }
    try {
      const res = await fetch('/api/availability/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          mode: availableSchedule.timeMode === 'hours' ? 'hours' : 'full_day',
          startTime: availableSchedule.startTime || null,
          endTime: availableSchedule.endTime || null,
          slotIntervalMinutes: availableSchedule.slotIntervalMinutes,
          customSlots: availableSchedule.customSlots,
          disabledGeneratedStarts: availableSchedule.disabledGeneratedStarts,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save template');
      setTemplates((prev) => [data.template, ...prev]);
      setTemplateName('');
      setMessageTone('ok');
      setMessage(`Saved template “${name}”`);
    } catch (error: unknown) {
      setMessageTone('err');
      setMessage(error instanceof Error ? error.message : 'Could not save template');
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/availability/templates?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not delete template');
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (error: unknown) {
      setMessageTone('err');
      setMessage(error instanceof Error ? error.message : 'Could not delete template');
    }
  };

  const handleSave = async () => {
    const available = Array.from(selectedDates).filter((key) => !isPast(key));
    const unavailable = Array.from(offDates).filter((key) => !isPast(key));

    if (available.length === 0 && unavailable.length === 0) {
      setMessageTone('err');
      setMessage('Select at least one date on the calendar.');
      return;
    }

    for (const key of available) {
      const schedule = dateSchedules[key] || DEFAULT_AVAILABLE;
      if (schedule.timeMode !== 'hours') continue;

      const hasWindow = Boolean(schedule.startTime && schedule.endTime);
      const hasCustom = schedule.customSlots.length > 0;

      if (!hasWindow && !hasCustom) {
        setMessageTone('err');
        setMessage(
          `Add a From–To range or a custom time on ${formatChipDate(key)}.`
        );
        return;
      }

      if (hasWindow && schedule.startTime >= schedule.endTime) {
        setMessageTone('err');
        setMessage(`End time must be after start time on ${formatChipDate(key)}.`);
        return;
      }
    }

    setIsSaving(true);
    setMessage('');
    try {
      const requests: Promise<Response>[] = [];

      // Group available dates by identical schedule payload for fewer bulk calls.
      const groups = new Map<string, string[]>();
      for (const key of available) {
        const schedule = dateSchedules[key] || DEFAULT_AVAILABLE;
        const groupKey = JSON.stringify({
          mode: schedule.timeMode,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          slotIntervalMinutes: schedule.slotIntervalMinutes,
          customSlots: schedule.customSlots,
          disabledGeneratedStarts: schedule.disabledGeneratedStarts,
        });
        const list = groups.get(groupKey) || [];
        list.push(key);
        groups.set(groupKey, list);
      }

      for (const [groupKey, dates] of groups) {
        const schedule = JSON.parse(groupKey) as {
          mode: TimeMode;
          startTime: string;
          endTime: string;
          slotIntervalMinutes: SlotInterval;
          customSlots: TimeRange[];
          disabledGeneratedStarts: string[];
        };
        requests.push(
          fetch('/api/availability/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dates,
              isAvailable: true,
              mode: schedule.mode === 'hours' ? 'hours' : 'full_day',
              startTime: schedule.startTime || null,
              endTime: schedule.endTime || null,
              slotIntervalMinutes: schedule.slotIntervalMinutes,
              customSlots: schedule.customSlots,
              disabledGeneratedStarts: schedule.disabledGeneratedStarts,
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
              mode: 'full_day',
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
    } catch (error: unknown) {
      setMessageTone('err');
      setMessage(error instanceof Error ? error.message : 'Could not save availability');
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
            const hoursMode = dateSchedules[cell.key]?.timeMode === 'hours';

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
                  hoursMode && selected ? 'is-hours' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={past}
                onClick={() => handleDayClick(cell.key)}
                aria-pressed={selected || off}
                aria-current={isActive ? 'date' : undefined}
                aria-label={`${formatChipDate(cell.key)}${off ? ', off day' : ''}${selected ? ', available' : ''}${hoursMode ? ', hourly' : ''}`}
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
              <>
                <div style={{ marginTop: 12 }}>
                  <p className="foleio-avail-mgmt-label">Slot duration</p>
                  <div
                    role="radiogroup"
                    aria-label="Slot duration"
                    style={{
                      display: 'flex',
                      gap: 16,
                      marginTop: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    {([60, 90] as SlotInterval[]).map((minutes) => (
                      <label
                        key={minutes}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          color: '#f4f4f5',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        <input
                          type="radio"
                          name="slot-interval"
                          checked={activeSchedule.slotIntervalMinutes === minutes}
                          onChange={() => updateSlotInterval(minutes)}
                        />
                        {minutes} minutes
                      </label>
                    ))}
                  </div>
                </div>

                {activeSchedule.startTime && activeSchedule.endTime ? (
                  <>
                    <div
                      className="foleio-avail-time-range"
                      style={{ alignItems: 'flex-end', marginTop: 14 }}
                    >
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
                      <button
                        type="button"
                        onClick={clearDefaultWindow}
                        aria-label="Remove default From–To hours"
                        title="Remove default hours"
                        style={{
                          border: '1px solid #3a3a3a',
                          background: 'transparent',
                          color: '#fafafa',
                          cursor: 'pointer',
                          borderRadius: 8,
                          padding: '8px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: 38,
                          marginBottom: 1,
                        }}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </div>

                    <p className="foleio-avail-mgmt-hint" style={{ marginTop: 12 }}>
                      {activeSchedule.slotIntervalMinutes}-minute slots — tap to
                      disable
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {previewSlots
                        .filter((s) => s.source === 'generated')
                        .map((slot) => (
                          <button
                            key={`${slot.startTime}-${slot.endTime}`}
                            type="button"
                            onClick={() => toggleGeneratedSlot(slot.startTime)}
                            style={{
                              border: '1px solid #3a3a3a',
                              borderRadius: 8,
                              padding: '6px 10px',
                              fontSize: 12,
                              background: slot.isActive ? '#202020' : '#141414',
                              color: slot.isActive ? '#fafafa' : '#777',
                              textDecoration: slot.isActive
                                ? 'none'
                                : 'line-through',
                              cursor: 'pointer',
                            }}
                          >
                            {formatSlotLabel(slot.startTime, slot.endTime)}
                          </button>
                        ))}
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: 4 }}>
                    <p className="foleio-avail-mgmt-hint" style={{ margin: 0 }}>
                      Default hours removed — using custom times only.
                    </p>
                    <button
                      type="button"
                      onClick={restoreDefaultWindow}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#f4f4f5',
                        cursor: 'pointer',
                        padding: 0,
                        marginTop: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: 'underline',
                        textUnderlineOffset: 3,
                      }}
                    >
                      Restore From–To hours
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  {activeSchedule.customSlots.length > 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      {activeSchedule.customSlots.map((slot, index) => (
                        <div
                          key={`custom-${slot.startTime}-${slot.endTime}-${index}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 10,
                            borderRadius: 8,
                            background:
                              editingCustomIndex === index ? '#3a3a3a' : '#2b2b2b',
                            padding: '0 12px',
                            height: 38,
                            color: '#fafafa',
                            fontSize: 14,
                            fontWeight: 500,
                          }}
                        >
                          <span>{formatSlotLabel(slot.startTime, slot.endTime)}</span>
                          <button
                            type="button"
                            onClick={() => beginEditCustomSlot(index)}
                            aria-label={`Edit ${formatSlotLabel(slot.startTime, slot.endTime)}`}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#fafafa',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Pencil className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {!showCustomForm ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomIndex(null);
                        setCustomFrom(DEFAULT_CUSTOM_FROM);
                        setCustomTo(DEFAULT_CUSTOM_TO);
                        setShowCustomForm(true);
                      }}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        background: '#2b2b2b',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Add custom time
                    </button>
                  ) : (
                    <div>
                      <p className="foleio-avail-mgmt-label">
                        {editingCustomIndex !== null
                          ? 'Edit custom time'
                          : 'Custom time'}
                      </p>
                      <div
                        className="foleio-avail-time-range"
                        style={{
                          marginTop: 8,
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          gap: 12,
                        }}
                      >
                        <Time12Field
                          label="From"
                          value={customFrom}
                          onChange={setCustomFrom}
                        />
                        <Time12Field
                          label="To"
                          value={customTo}
                          onChange={setCustomTo}
                        />
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          className="foleio-avail-time-mode is-active"
                          onClick={addCustomSlot}
                        >
                          {editingCustomIndex !== null ? 'Save changes' : 'Save time'}
                        </button>
                        {editingCustomIndex !== null ? (
                          <button
                            type="button"
                            onClick={() => removeCustomSlot(editingCustomIndex)}
                            aria-label="Delete custom time"
                            style={{
                              border: '1px solid #3a3a3a',
                              background: 'transparent',
                              color: '#fafafa',
                              cursor: 'pointer',
                              borderRadius: 8,
                              padding: '8px 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={cancelCustomForm}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#a1a1aa',
                            cursor: 'pointer',
                            padding: '8px 4px',
                            fontSize: 13,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="foleio-avail-time-full-hint">
                {isAvailableMode
                  ? 'One booking for this whole day'
                  : 'This date will be off all day'}
              </p>
            )}
          </div>

          {isAvailableMode ? (
            <div style={{ marginTop: 20 }}>
              <p className="foleio-avail-mgmt-label">Schedule templates</p>
              {templates.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid #3a3a3a',
                        borderRadius: 8,
                        padding: '4px 8px',
                      }}
                    >
                      <button
                        type="button"
                        className="foleio-avail-time-mode"
                        onClick={() => applyTemplate(template.id)}
                      >
                        Apply {template.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteTemplate(template.id)}
                        aria-label={`Delete ${template.name}`}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#888',
                          cursor: 'pointer',
                        }}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="foleio-avail-mgmt-hint" style={{ marginTop: 6 }}>
                  Save this day’s schedule to reuse on other dates
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 10,
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    border: '1px solid #3a3a3a',
                    background: '#151515',
                    color: '#eee',
                    padding: '8px 10px',
                    fontSize: 13,
                  }}
                />
                <button
                  type="button"
                  className="foleio-avail-time-mode"
                  onClick={() => void saveTemplate()}
                >
                  Save template
                </button>
              </div>
            </div>
          ) : null}
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
