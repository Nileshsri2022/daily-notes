/**
 * Pure date helpers for the calendar view. No React imports —
 * unit-tested in tests/calendar.spec.ts.
 */

/** Monday-first week (0 = Sunday, 1 = Monday). */
export const WEEK_START = 1;

export interface CalendarDay {
  date: Date;
  /** "YYYY-MM-DD" in local time. */
  key: string;
  /** Day belongs to the displayed month (vs. leading/trailing filler). */
  inMonth: boolean;
  isToday: boolean;
}

/** Local-time "YYYY-MM-DD" key. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 42 cells (6 rows x 7 cols) for the given month. Cells outside the
 * month are included (inMonth: false) so every week row is complete.
 * `month` is 0-based (0 = January).
 */
export function getMonthGrid(
  year: number,
  month: number,
  today: Date = new Date()
): CalendarDay[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - WEEK_START + 7) % 7;
  const start = new Date(year, month, 1 - offset);
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i
    );
    days.push({
      date,
      key: dayKey(date),
      inMonth: date.getMonth() === month,
      isToday: isSameDay(date, today),
    });
  }
  return days;
}

export interface DatedNote {
  updatedAt: number;
  deletedAt?: number | null;
}

/**
 * Group non-deleted notes by calendar day key, using each note's
 * `updatedAt` timestamp (the schema has no immutable entry date —
 * see the calendar design spec for the documented limitation).
 */
export function groupNotesByDay<T extends DatedNote>(
  notes: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const note of notes) {
    if (note.deletedAt !== undefined && note.deletedAt !== null) continue;
    const key = dayKey(new Date(note.updatedAt));
    const arr = map.get(key);
    if (arr) arr.push(note);
    else map.set(key, [note]);
  }
  return map;
}

/** "October 2026" style month label. */
export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** "Friday, October 10" style day label. */
export function dayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** "7:30 PM" style time label. */
export function timeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Month arithmetic with year rollover. `month` is 0-based. */
export function addMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}
