import { dayKey } from "./calendar";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function shiftDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function toSet(keys: Set<string> | string[]): Set<string> {
  return keys instanceof Set ? keys : new Set(keys);
}

/**
 * Current streak: consecutive checked days ending today.
 * If today isn't checked yet, yesterday counts as a grace day —
 * a streak started yesterday is still alive at 1, not 0.
 * Any gap breaks the run.
 */
export function currentStreak(
  checkKeys: Set<string> | string[],
  today: Date = new Date(),
): number {
  const set = toSet(checkKeys);
  let cursor = startOfDay(today);
  if (!set.has(dayKey(cursor))) {
    cursor = shiftDays(cursor, -1);
    if (!set.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

/** Total check-ins, for the lifetime count. */
export function totalCheckins(checkKeys: Set<string> | string[]): number {
  return toSet(checkKeys).size;
}

export interface DayDot {
  key: string;
  date: Date;
  checked: boolean;
  isToday: boolean;
}

/** Last 7 days, oldest first, for the adherence strip. */
export function last7Days(
  checkKeys: Set<string> | string[],
  today: Date = new Date(),
): DayDot[] {
  const set = toSet(checkKeys);
  const base = startOfDay(today);
  const todayKey = dayKey(base);
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDays(base, i - 6);
    const key = dayKey(date);
    return { key, date, checked: set.has(key), isToday: key === todayKey };
  });
}

/** Single-letter weekday label (Mon-first, matching the calendar). */
export function weekdayLetter(date: Date): string {
  return "MTWTFSS"[(date.getDay() + 6) % 7];
}
