'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { EmptyState } from '@/components/demo/EmptyState';
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
import styles from '@/components/demo/demo-dashboard.module.css';
import { UpgradeModal } from '@/components/creator/UpgradeModal';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';
import {
  getCreatorPlan,
  getCreatorPlanLimits,
  type PlatformPlan,
} from '@/lib/utils/plan-limits';

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

interface DayBooking {
  bookingDate: string;
  customerName: string;
  startTime?: string | null;
  serviceName?: string | null;
}

export type AvailabilityDayStatus = {
  date: string;
  isAvailable: boolean;
};

interface AvailabilitySetupFormProps {
  creatorId: string;
  availability: AvailabilityItem[];
  bookings?: DayBooking[];
  platformPlan?: string | null;
  platformSubscriptionActive?: boolean | null;
  onAvailabilityChange?: (days: AvailabilityDayStatus[]) => void;
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

function eachDateKey(from: string, to: string) {
  const cursor = parseDateKey(from);
  const end = parseDateKey(to);
  const keys: string[] = [];
  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
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
            border: '1px solid rgba(17, 24, 39, 0.12)',
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
                background: value.amPm === period ? '#f3f1f4' : 'transparent',
                color: value.amPm === period ? '#111827' : '#6b7280',
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

function shortClock(value?: string | null) {
  if (!value) return '';
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw || 0);
  if (!Number.isFinite(hour)) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return minute ? `${hour12}:${String(minute).padStart(2, '0')} ${period}` : `${hour12} ${period}`;
}

export function AvailabilitySetupForm({
  availability: initialAvailability,
  bookings = [],
  platformPlan = null,
  platformSubscriptionActive = false,
  onAvailabilityChange,
}: AvailabilitySetupFormProps) {
  const { isOpen, limitType, showUpgradeModal, closeUpgradeModal } = useUpgradeModal();
  const currentPlan: PlatformPlan = getCreatorPlan(platformPlan ?? null);
  const limits = getCreatorPlanLimits({
    platformPlan,
    platformSubscriptionActive,
  });
  const canUseTemplates = limits.canUseAvailabilityTemplates;

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
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeSaving, setRangeSaving] = useState(false);
  const [rangeMessage, setRangeMessage] = useState('');
  const [rangeTone, setRangeTone] = useState<'ok' | 'err'>('ok');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'ok' | 'err'>('ok');
  const [rangeFrom, setRangeFrom] = useState(todayKey);
  const [rangeTo, setRangeTo] = useState(todayKey);

  const activeSchedule = isAvailableMode ? availableSchedule : offSchedule;
  const setActiveSchedule = isAvailableMode ? setAvailableSchedule : setOffSchedule;

  useEffect(() => {
    onAvailabilityChange?.([
      ...Array.from(selectedDates, (date) => ({ date, isAvailable: true })),
      ...Array.from(offDates, (date) => ({ date, isAvailable: false })),
    ]);
  }, [offDates, onAvailabilityChange, selectedDates]);

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
    setOffSchedule(DEFAULT_OFF);
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
    if (!canUseTemplates) {
      showUpgradeModal('availabilityTemplates');
      return;
    }
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
      if (!res.ok) {
        if (data.limitType === 'availabilityTemplates') {
          showUpgradeModal('availabilityTemplates');
          return;
        }
        throw new Error(data.error || 'Could not save template');
      }
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
    const nextSelected = new Set(selectedDates);
    const nextOff = new Set(offDates);
    const nextSchedules = { ...dateSchedules };
    let openedSchedule: DaySchedule | null = null;

    if (activeDate && !isPast(activeDate)) {
      openedSchedule = {
        ...activeSchedule,
        timeMode: 'hours',
        startTime: activeSchedule.startTime || DEFAULT_HOURS_WINDOW.startTime,
        endTime: activeSchedule.endTime || DEFAULT_HOURS_WINDOW.endTime,
        customSlots: [...activeSchedule.customSlots],
        disabledGeneratedStarts: [...activeSchedule.disabledGeneratedStarts],
      };
      nextSelected.add(activeDate);
      nextOff.delete(activeDate);
      nextSchedules[activeDate] = openedSchedule;
    }

    const available = Array.from(nextSelected).filter((key) => !isPast(key));
    const unavailable = Array.from(nextOff).filter((key) => !isPast(key));

    if (available.length === 0 && unavailable.length === 0) {
      setMessageTone('err');
      setMessage('Select at least one date on the calendar.');
      return;
    }

    for (const key of available) {
      const schedule = nextSchedules[key] || DEFAULT_AVAILABLE;
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
        const schedule = nextSchedules[key] || DEFAULT_AVAILABLE;
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

      if (activeDate && openedSchedule) {
        setIsAvailableMode(true);
        setAvailableSchedule(openedSchedule);
        applyStatusToDate(activeDate, true, openedSchedule);
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

  const bookingsOn = (key: string) =>
    bookings.filter((booking) => String(booking.bookingDate).slice(0, 10) === key);

  const dayHours = (key: string) => {
    if (!selectedDates.has(key) || offDates.has(key)) return 'Off';
    const schedule = dateSchedules[key];
    if (!schedule || schedule.timeMode !== 'hours' || !schedule.startTime || !schedule.endTime) return 'Open';
    return `${shortClock(schedule.startTime)} – ${shortClock(schedule.endTime)}`;
  };

  const setHourField = (field: 'startTime' | 'endTime', value: string) => {
    const next: DaySchedule = {
      ...activeSchedule,
      timeMode: 'hours',
      startTime: field === 'startTime' ? value : activeSchedule.startTime || DEFAULT_HOURS_WINDOW.startTime,
      endTime: field === 'endTime' ? value : activeSchedule.endTime || DEFAULT_HOURS_WINDOW.endTime,
    };
    if (!isAvailableMode && activeDate) {
      setIsAvailableMode(true);
      setAvailableSchedule(next);
      applyStatusToDate(activeDate, true, next);
      return;
    }
    syncActiveSchedule(next);
  };

  const makeOffDay = () => {
    if (!activeDate) return;
    setIsAvailableMode(false);
    applyStatusToDate(activeDate, false, { ...offSchedule });
  };

  const applyDateRange = async () => {
    if (!activeDate || !isAvailableMode) {
      setRangeTone('err');
      setRangeMessage('Select a day, turn it on, and set its hours first.');
      return;
    }
    if (!rangeFrom || !rangeTo) {
      setRangeTone('err');
      setRangeMessage('Choose a from date and a to date.');
      return;
    }
    if (rangeFrom > rangeTo) {
      setRangeTone('err');
      setRangeMessage('The to date has to be on or after the from date.');
      return;
    }

    const schedule: DaySchedule = {
      ...availableSchedule,
      customSlots: [...availableSchedule.customSlots],
      disabledGeneratedStarts: [...availableSchedule.disabledGeneratedStarts],
    };
    if (
      schedule.timeMode === 'hours' &&
      (!schedule.startTime || !schedule.endTime || schedule.startTime >= schedule.endTime)
    ) {
      setRangeTone('err');
      setRangeMessage('Set a from time that is earlier than the to time.');
      return;
    }

    const keys = eachDateKey(rangeFrom, rangeTo).filter((key) => !isPast(key));
    if (keys.length === 0) {
      setRangeTone('err');
      setRangeMessage('That range is in the past.');
      return;
    }
    if (keys.length > 92) {
      setRangeTone('err');
      setRangeMessage('Save up to 92 days at a time.');
      return;
    }

    setRangeSaving(true);
    setRangeMessage('');
    try {
      const response = await fetch('/api/availability/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: keys,
          isAvailable: true,
          mode: schedule.timeMode === 'hours' ? 'hours' : 'full_day',
          startTime: schedule.startTime || null,
          endTime: schedule.endTime || null,
          slotIntervalMinutes: schedule.slotIntervalMinutes,
          customSlots: schedule.customSlots,
          disabledGeneratedStarts: schedule.disabledGeneratedStarts,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save availability');
      }

      setSelectedDates((prev) => {
        const next = new Set(prev);
        keys.forEach((key) => next.add(key));
        return next;
      });
      setOffDates((prev) => {
        if (!keys.some((key) => prev.has(key))) return prev;
        const next = new Set(prev);
        keys.forEach((key) => next.delete(key));
        return next;
      });
      setDateSchedules((prev) => {
        const next = { ...prev };
        keys.forEach((key) => {
          next[key] = {
            ...schedule,
            customSlots: [...schedule.customSlots],
            disabledGeneratedStarts: [...schedule.disabledGeneratedStarts],
          };
        });
        return next;
      });
      const first = parseDateKey(keys[0]);
      setViewMonth(new Date(first.getFullYear(), first.getMonth(), 1));
      setRangeTone('ok');
      setRangeMessage(`Saved ${keys.length} day${keys.length === 1 ? '' : 's'}.`);
    } catch (error: unknown) {
      setRangeTone('err');
      setRangeMessage(error instanceof Error ? error.message : 'Could not save those days.');
    } finally {
      setRangeSaving(false);
    }
  };

  const monthPrefix = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthOpen = Array.from(selectedDates).filter((key) => key.startsWith(monthPrefix) && key >= todayKey);
  const monthOff = Array.from(offDates).filter((key) => key.startsWith(monthPrefix) && key >= todayKey).sort();
  const monthBooked = monthOpen.filter((key) => bookingsOn(key).length > 0).length;
  const activeBookings = activeDate ? bookingsOn(activeDate) : [];
  const activeTitle = activeDate
    ? parseDateKey(activeDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : 'Select a day';

  return (
    <div className={styles.availLayout}>
      <section className={styles.card}>
        <div className={styles.calHead}>
          <button type="button" className={styles.calNav} onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <h2>{monthLabel}</h2>
          <button type="button" className={styles.calNav} onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span className={styles.calTz}>Times in {timezoneLabel.offset}, {timezoneLabel.city}</span>
          <button
            type="button"
            className={styles.todayBtn}
            onClick={() => setViewMonth(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))}
          >
            Today
          </button>
        </div>
        <div className={styles.calWeek}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className={styles.calGrid}>
          {cells.map((cell, index) => {
            if (!cell) return <span key={`pad-${index}`} className={styles.calPad} />;
            const past = isPast(cell.key);
            const off = offDates.has(cell.key) || !selectedDates.has(cell.key);
            const selected = activeDate === cell.key;
            const isToday = cell.key === todayKey;
            const count = bookingsOn(cell.key).length;
            const hours = dayHours(cell.key);
            return (
              <button
                key={cell.key}
                type="button"
                className={[
                  styles.calDay,
                  isToday ? styles.calToday : '',
                  selected ? styles.calOn : '',
                  !past && off ? styles.calOff : '',
                  past ? styles.calPast : '',
                ].filter(Boolean).join(' ')}
                disabled={past}
                onClick={() => handleDayClick(cell.key)}
                aria-pressed={selected}
                aria-label={`${formatChipDate(cell.key)}, ${hours}${count ? `, ${count} booked` : ''}`}
              >
                <b>{cell.day}</b>
                {count > 0 ? <small className={styles.bookedDot}>{count} booked</small> : null}
                {!past ? <small>{hours}</small> : null}
              </button>
            );
          })}
        </div>
        <div className={styles.calLegend}>
          <span><i className={styles.swatch} /> Open</span>
          <span><i className={styles.dot} /> Has a booking</span>
          <span><i className={`${styles.swatch} ${styles.swatchOff}`} /> Off day</span>
          <span style={{ marginLeft: 'auto' }}>Pick a day to change its hours</span>
        </div>
        <button
          type="button"
          className={styles.textLink}
          aria-expanded={rangeOpen}
          onClick={() => {
            setRangeOpen((open) => {
              if (!open) {
                const start = activeDate && !isPast(activeDate) ? activeDate : todayKey;
                const end = parseDateKey(start);
                end.setDate(end.getDate() + 6);
                setRangeFrom(start);
                setRangeTo(toDateKey(end));
                setRangeMessage('');
              }
              return !open;
            });
          }}
        >
          {rangeOpen ? 'Hide date range' : 'Apply these hours to other days'}
        </button>
        {rangeOpen ? (
          <div>
            <div className={styles.hoursRow}>
              <input
                type="date"
                aria-label="From date"
                min={todayKey}
                value={rangeFrom}
                onChange={(event) => setRangeFrom(event.target.value)}
              />
              <span>to</span>
              <input
                type="date"
                aria-label="To date"
                min={rangeFrom || todayKey}
                value={rangeTo}
                onChange={(event) => setRangeTo(event.target.value)}
              />
            </div>
            <div className={styles.dayActions}>
              <button
                type="button"
                className={styles.solid}
                onClick={() => void applyDateRange()}
                disabled={rangeSaving || isSaving || !activeDate || !isAvailableMode}
              >
                {rangeSaving ? 'Saving…' : 'Save these days'}
              </button>
            </div>
            {!activeDate || !isAvailableMode ? (
              <p className={styles.quiet}>Select a day, turn it on, and set its hours first.</p>
            ) : null}
            {rangeMessage ? (
              <p className={styles.quiet} style={{ color: rangeTone === 'err' ? '#be123c' : '#047857' }}>
                {rangeMessage}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <aside className={styles.bookSide}>
        <section className={`${styles.card} ${styles.dayPanel}`}>
          <div className={styles.dayTop}>
            <div>
              <p className={styles.quiet} style={{ marginTop: 0 }}>Selected day</p>
              <h2>{activeTitle}</h2>
            </div>
            <span className={styles.liveLabel}>
              Open
              <button
                type="button"
                className={`${styles.switch} ${isAvailableMode ? styles.switchOn : ''}`}
                aria-pressed={isAvailableMode}
                aria-label={isAvailableMode ? 'Open' : 'Off'}
                onClick={handleAvailabilityToggle}
                disabled={!activeDate}
              >
                <i />
              </button>
            </span>
          </div>
          {activeDate ? (
          <>
          <p className={styles.svcMeta}>Hours</p>
          <div className={styles.hoursRow}>
            <input
              type="time"
              aria-label="From"
              value={activeSchedule.startTime || ''}
              onChange={(event) => setHourField('startTime', event.target.value)}
              disabled={!activeDate}
            />
            <span>to</span>
            <input
              type="time"
              aria-label="To"
              value={activeSchedule.endTime || ''}
              onChange={(event) => setHourField('endTime', event.target.value)}
              disabled={!activeDate}
            />
          </div>
          <div className={styles.hoursRow}>
            <select
              aria-label="Slot length"
              value={activeSchedule.slotIntervalMinutes}
              disabled={!activeDate}
              onChange={(event) =>
                updateSlotInterval(Number(event.target.value) === 90 ? 90 : 60)
              }
            >
              <option value={60}>60 minute slots</option>
              <option value={90}>90 minute slots</option>
            </select>
          </div>
          {!showCustomForm ? (
            <button
              type="button"
              className={styles.textLink}
              disabled={!activeDate}
              onClick={() => {
                setEditingCustomIndex(null);
                setCustomFrom(DEFAULT_CUSTOM_FROM);
                setCustomTo(DEFAULT_CUSTOM_TO);
                setShowCustomForm(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              Add a second time range
            </button>
          ) : (
            <div style={{ marginTop: 10 }}>
              <Time12Field label="From" value={customFrom} onChange={setCustomFrom} />
              <Time12Field label="To" value={customTo} onChange={setCustomTo} />
              <div className={styles.dayActions}>
                <button type="button" className={styles.solid} onClick={addCustomSlot}>
                  {editingCustomIndex !== null ? 'Save range' : 'Add range'}
                </button>
                <button type="button" className={styles.ghost} onClick={cancelCustomForm}>Cancel</button>
              </div>
            </div>
          )}
          {activeSchedule.customSlots.map((slot, index) => (
            <div key={`${slot.startTime}-${slot.endTime}-${index}`} className={styles.dayBooking}>
              {formatSlotLabel(slot.startTime, slot.endTime)}
              <button type="button" className={styles.textLink} style={{ marginLeft: 8 }} onClick={() => removeCustomSlot(index)}>
                Remove
              </button>
            </div>
          ))}
          {activeBookings.length > 0 ? (
            <div className={styles.dayBooking}>
              <span className={styles.bookedDot}>
                {activeBookings.length === 1 ? '1 booking on this day' : `${activeBookings.length} bookings on this day`}
              </span>
              {activeBookings.map((booking) => (
                <div key={`${booking.customerName}-${booking.startTime || ''}`}>
                  {[shortClock(booking.startTime), booking.serviceName, booking.customerName].filter(Boolean).join(' · ')}
                </div>
              ))}
            </div>
          ) : null}
          <div className={styles.dayActions}>
            <button type="button" className={styles.solid} onClick={() => void handleSave()} disabled={isSaving || !activeDate}>
              {isSaving ? 'Saving…' : 'Save hours'}
            </button>
            <button type="button" className={styles.ghost} onClick={makeOffDay} disabled={!activeDate || !isAvailableMode}>
              Make it an off day
            </button>
          </div>
          {message ? (
            <p className={styles.quiet} style={{ color: messageTone === 'err' ? '#be123c' : '#047857' }}>{message}</p>
          ) : null}
          </>
          ) : (
            <EmptyState icon={Calendar} title="No day selected" body="Pick a day on the calendar to set its hours." />
          )}
        </section>

        <section className={styles.softCard}>
          <h2>Rest of {viewMonth.toLocaleDateString('en-GB', { month: 'long' })}</h2>
          <div className={styles.statRow}><span>Open days</span><strong>{monthOpen.length}</strong></div>
          <div className={styles.statRow}><span>With a booking</span><strong>{monthBooked}</strong></div>
          <div className={styles.statRow}>
            <span>Off days</span>
            <strong>{monthOff.length === 0 ? 'None' : monthOff.map((key) => parseDateKey(key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })).join(', ')}</strong>
          </div>
        </section>

        {canUseTemplates ? (
          <section className={styles.card}>
            <h2 className={styles.sideTitle}>Weekly template</h2>
            <p className={styles.quiet}>Save this day’s hours and reuse them on other dates.</p>
            {templates.map((template) => (
              <div key={template.id} className={styles.statRow}>
                <button type="button" className={styles.textLink} style={{ marginTop: 0 }} onClick={() => applyTemplate(template.id)}>
                  Apply {template.name}
                </button>
                <button type="button" className={styles.textLink} style={{ marginTop: 0 }} onClick={() => void deleteTemplate(template.id)}>
                  Remove
                </button>
              </div>
            ))}
            <div className={styles.hoursRow}>
              <input
                type="text"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Template name"
                aria-label="Template name"
              />
              <button type="button" className={styles.solid} onClick={() => void saveTemplate()}>Save</button>
            </div>
          </section>
        ) : (
          <section className={styles.inkCard}>
            <h2>Weekly template <span className={styles.proMark}>PRO</span></h2>
            <p>Set your usual hours once and reuse them, so you are not setting each date by hand.</p>
            <button type="button" className={styles.ghost} onClick={() => showUpgradeModal('availabilityTemplates')}>
              See Pro
            </button>
          </section>
        )}
      </aside>

      {limitType ? (
        <UpgradeModal
          isOpen={isOpen}
          onClose={closeUpgradeModal}
          limitType={limitType}
          currentPlan={currentPlan}
        />
      ) : null}
    </div>
  );
}
