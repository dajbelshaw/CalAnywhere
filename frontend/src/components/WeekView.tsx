import { Fragment } from "react";

export interface Slot {
  start: Date;
  end: Date;
}

export interface WeekDayData {
  date: Date;
  dateStr: string;
  slots: Slot[];
}

interface WeekViewProps {
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  weekDays: WeekDayData[];
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
  startHour: number;
  endHour: number;
  durationMinutes: number;
  bufferMinutes: number;
}

function formatWeekRange(start: Date, days: WeekDayData[]): string {
  if (days.length === 0) return "";
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (first.getFullYear() !== last.getFullYear()) {
    return `${first.toLocaleDateString(undefined, { ...opts, year: "numeric" })} – ${last.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
  }
  if (first.getMonth() === last.getMonth()) {
    return `${first.toLocaleDateString(undefined, { month: "short" })} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
  }
  return `${first.toLocaleDateString(undefined, opts)} – ${last.toLocaleDateString(undefined, opts)}, ${first.getFullYear()}`;
}

function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function WeekView({
  weekStart: _weekStart,
  onPrevWeek,
  onNextWeek,
  canGoPrev,
  canGoNext,
  weekDays,
  selectedSlot,
  onSelectSlot,
  startHour,
  endHour,
  durationMinutes,
  bufferMinutes
}: WeekViewProps) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const numCols = weekDays.length;
  const slotInterval = durationMinutes + bufferMinutes;

  // Build time rows
  const timeRows: { hour: number; minute: number; label: string }[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m + durationMinutes <= 60 && h * 60 + m + durationMinutes <= endHour * 60; m += slotInterval) {
      timeRows.push({ hour: h, minute: m, label: padTime(h, m) });
    }
  }

  // Build a set of slot keys for quick lookup: "dateStr|HH:MM"
  const slotMap = new Map<string, Slot>();
  for (const day of weekDays) {
    for (const slot of day.slots) {
      const key = `${day.dateStr}|${padTime(slot.start.getHours(), slot.start.getMinutes())}`;
      slotMap.set(key, slot);
    }
  }

  const isSelected = (slot: Slot) =>
    !!selectedSlot &&
    selectedSlot.start.getTime() === slot.start.getTime() &&
    selectedSlot.end.getTime() === slot.end.getTime();

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevWeek}
            disabled={!canGoPrev}
            className="week-nav-btn disabled:opacity-30"
            aria-label="Previous week"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            disabled={!canGoNext}
            className="week-nav-btn disabled:opacity-30"
            aria-label="Next week"
          >
            ›
          </button>
          <span className="ml-2 text-sm font-medium text-content">
            {formatWeekRange(_weekStart, weekDays)}
          </span>
        </div>
        <span className="text-[10px] text-content-subtle">{timezone}</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `60px repeat(${numCols}, minmax(72px, 1fr))`
          }}
        >
          {/* Column headers */}
          <div /> {/* Empty top-left corner */}
          {weekDays.map((day) => {
            const dow = day.date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
            const dayNum = day.date.getDate();
            return (
              <div key={day.dateStr} className="week-header-cell pb-2">
                <div>{dow}</div>
                <div className="text-sm font-semibold text-content">{dayNum}</div>
              </div>
            );
          })}

          {/* Time rows */}
          {timeRows.map((row) => (
            <Fragment key={`row-${row.label}`}>
              {/* Time label */}
              <div
                className="week-time-label flex items-center justify-end"
              >
                {row.label}
              </div>

              {/* Day cells */}
              {weekDays.map((day) => {
                const key = `${day.dateStr}|${row.label}`;
                const slot = slotMap.get(key);

                if (slot) {
                  const sel = isSelected(slot);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSelectSlot(slot)}
                      className={sel ? "week-cell-selected" : "week-cell-available"}
                      aria-label={`${day.dateStr} ${row.label}`}
                      aria-pressed={sel}
                    >
                      {row.label}
                    </button>
                  );
                }

                return (
                  <div key={key} className="week-cell-busy">
                    —
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[10px] text-content-subtle">
        Only availability shown — event details remain private.
      </p>
    </div>
  );
}
