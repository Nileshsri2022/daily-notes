import { test, expect } from "@playwright/test";
import {
  WEEK_START,
  addMonths,
  dayKey,
  getMonthGrid,
  groupNotesByDay,
  monthLabel,
} from "../src/lib/calendar";

test.describe("calendar date helpers", () => {
  test.describe("dayKey", () => {
    test("formats a local date as YYYY-MM-DD", () => {
      expect(dayKey(new Date(2026, 9, 5))).toBe("2026-10-05");
    });

    test("zero-pads month and day", () => {
      expect(dayKey(new Date(2026, 0, 3))).toBe("2026-01-03");
    });
  });

  test.describe("getMonthGrid", () => {
    test("always returns 42 cells aligned to Monday start", () => {
      const grid = getMonthGrid(2026, 9); // October 2026
      expect(grid).toHaveLength(42);
      expect(WEEK_START).toBe(1);
      for (let i = 0; i < 42; i += 7) {
        expect(grid[i].date.getDay()).toBe(1); // Monday
      }
    });

    test("October 2026 starts on Monday Sep 28 with Oct 1 at index 3", () => {
      const grid = getMonthGrid(2026, 9);
      expect(grid[0].key).toBe("2026-09-28");
      expect(grid[0].inMonth).toBe(false);
      expect(grid[3].key).toBe("2026-10-01");
      expect(grid[3].inMonth).toBe(true);
      expect(grid[41].key).toBe("2026-11-08");
      expect(grid[41].inMonth).toBe(false);
      // 31 in-month days
      expect(grid.filter((c) => c.inMonth)).toHaveLength(31);
    });

    test("leap-year February 2024 has 29 in-month days", () => {
      const grid = getMonthGrid(2024, 1);
      expect(grid[0].key).toBe("2024-01-29");
      expect(grid.filter((c) => c.inMonth)).toHaveLength(29);
    });

    test("flags only the given today cell", () => {
      const today = new Date(2026, 9, 10);
      const grid = getMonthGrid(2026, 9, today);
      const flagged = grid.filter((c) => c.isToday);
      expect(flagged).toHaveLength(1);
      expect(flagged[0].key).toBe("2026-10-10");
    });
  });

  test.describe("groupNotesByDay", () => {
    test("groups notes by calendar day", () => {
      const notes = [
        { updatedAt: new Date(2026, 9, 10, 8, 0).getTime() },
        { updatedAt: new Date(2026, 9, 10, 20, 30).getTime() },
        { updatedAt: new Date(2026, 9, 11, 9, 0).getTime() },
      ];
      const grouped = groupNotesByDay(notes);
      expect(grouped.get("2026-10-10")).toHaveLength(2);
      expect(grouped.get("2026-10-11")).toHaveLength(1);
      expect(grouped.has("2026-10-12")).toBe(false);
    });

    test("excludes soft-deleted notes", () => {
      const notes = [
        { updatedAt: new Date(2026, 9, 10).getTime(), deletedAt: undefined },
        { updatedAt: new Date(2026, 9, 10).getTime(), deletedAt: 1234567890 },
      ];
      const grouped = groupNotesByDay(notes);
      expect(grouped.get("2026-10-10")).toHaveLength(1);
    });
  });

  test.describe("addMonths", () => {
    test("rolls over year boundaries", () => {
      expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
      expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    });

    test("adds within the same year", () => {
      expect(addMonths(2026, 5, 2)).toEqual({ year: 2026, month: 7 });
    });
  });

  test.describe("monthLabel", () => {
    test("names the month and year", () => {
      const label = monthLabel(2026, 9);
      expect(label).toContain("October");
      expect(label).toContain("2026");
    });
  });
});
