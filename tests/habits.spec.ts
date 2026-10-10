import { test, expect } from "@playwright/test";
import { currentStreak, last7Days, totalCheckins, weekdayLetter } from "../src/lib/habits";

// Fixed "today": Saturday 2026-10-10 (local).
const TODAY = new Date(2026, 9, 10);

test("consecutive run ending today counts fully", () => {
  expect(
    currentStreak(["2026-10-10", "2026-10-09", "2026-10-08", "2026-10-07"], TODAY),
  ).toBe(4);
});

test("grace day: yesterday checked, today not yet — streak alive", () => {
  expect(currentStreak(["2026-10-09", "2026-10-08"], TODAY)).toBe(2);
});

test("no check today or yesterday — streak is 0", () => {
  expect(currentStreak(["2026-10-08", "2026-10-07"], TODAY)).toBe(0);
});

test("a gap breaks the run; only the trailing run counts", () => {
  expect(
    currentStreak(
      ["2026-10-10", "2026-10-09", "2026-10-07", "2026-10-06"],
      TODAY,
    ),
  ).toBe(2);
});

test("empty check set gives 0", () => {
  expect(currentStreak([], TODAY)).toBe(0);
});

test("single check today gives 1", () => {
  expect(currentStreak(["2026-10-10"], TODAY)).toBe(1);
});

test("works across month boundary", () => {
  expect(
    currentStreak(["2026-10-01", "2026-09-30", "2026-09-29"], new Date(2026, 9, 1)),
  ).toBe(3);
});

test("accepts a Set as well as an array", () => {
  expect(currentStreak(new Set(["2026-10-10"]), TODAY)).toBe(1);
});

test("last7Days returns 7 entries oldest-first with correct flags", () => {
  const days = last7Days(["2026-10-10", "2026-10-08"], TODAY);
  expect(days).toHaveLength(7);
  expect(days[0].key).toBe("2026-10-04");
  expect(days[6].key).toBe("2026-10-10");
  expect(days[6].isToday).toBe(true);
  expect(days[6].checked).toBe(true);
  expect(days[4].key).toBe("2026-10-08");
  expect(days[4].checked).toBe(true);
  expect(days[5].checked).toBe(false);
  expect(days.slice(0, 6).every((d) => !d.isToday)).toBe(true);
});

test("totalCheckins counts the set", () => {
  expect(totalCheckins(["2026-10-10", "2026-10-09"])).toBe(2);
  expect(totalCheckins([])).toBe(0);
});

test("weekdayLetter is Mon-first", () => {
  expect(weekdayLetter(new Date(2026, 9, 5))).toBe("M"); // Monday
  expect(weekdayLetter(new Date(2026, 9, 10))).toBe("S"); // Saturday
  expect(weekdayLetter(new Date(2026, 9, 11))).toBe("S"); // Sunday
});
