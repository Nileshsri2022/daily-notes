import { test, expect } from "@playwright/test";
import {
  addWeeks,
  buildDigestPrompt,
  extractTaskStats,
  sanitizeDigestResponse,
  startOfWeek,
  weekDayKeys,
  weekKeyFor,
  weekLabel,
  weekRange,
} from "../src/lib/review";

test("startOfWeek is Monday", () => {
  // Saturday 2026-10-10 → Monday 2026-10-05
  const mon = startOfWeek(new Date(2026, 9, 10));
  expect(mon.getDay()).toBe(1);
  expect(mon.getDate()).toBe(5);
  // Sunday → same Monday
  expect(startOfWeek(new Date(2026, 9, 11)).getDate()).toBe(5);
  // Monday itself
  expect(startOfWeek(new Date(2026, 9, 5)).getDate()).toBe(5);
});

test("weekKeyFor uses ISO weeks", () => {
  expect(weekKeyFor(new Date(2026, 9, 10))).toBe("2026-W41");
  expect(weekKeyFor(new Date(2026, 9, 5))).toBe("2026-W41");
  // Jan 1 2026 is a Thursday → still W01 of 2026
  expect(weekKeyFor(new Date(2026, 0, 1))).toBe("2026-W01");
});

test("weekRange round-trips and spans Mon–Sun", () => {
  const { start, end } = weekRange("2026-W41");
  expect(start.getDay()).toBe(1);
  expect(start.getDate()).toBe(5);
  expect(end.getDay()).toBe(0);
  expect(end.getDate()).toBe(11);
  expect(weekKeyFor(start)).toBe("2026-W41");
});

test("weekRange rejects garbage", () => {
  expect(() => weekRange("nope")).toThrow();
});

test("addWeeks shifts across year boundary", () => {
  expect(addWeeks("2026-W01", -1)).toBe("2025-W52");
  expect(addWeeks("2026-W41", 1)).toBe("2026-W42");
});

test("weekLabel formats within and across months", () => {
  expect(weekLabel("2026-W41")).toBe("October 5 – 11, 2026");
  // W40 2026: Mon Sep 28 – Sun Oct 4
  expect(weekLabel("2026-W40")).toBe("September 28, 2026 – October 4, 2026");
});

test("weekDayKeys returns 7 Mon–Sun keys", () => {
  const keys = weekDayKeys("2026-W41");
  expect(keys).toHaveLength(7);
  expect(keys[0]).toBe("2026-10-05");
  expect(keys[6]).toBe("2026-10-11");
});

test("extractTaskStats counts done/pending and captures texts", () => {
  const r = extractTaskStats([
    "- [ ] Buy milk\n- [x] Call doctor\nSome prose",
    "1. [X] Done numbered\n- [ ]  Trimmed  ",
  ]);
  expect(r.done).toBe(2);
  expect(r.pending).toBe(2);
  expect(r.pendingTexts).toEqual(["Buy milk", "Trimmed"]);
});

test("buildDigestPrompt includes notes, stats, and pending tasks", () => {
  const { system, user } = buildDigestPrompt(
    [
      {
        title: "Gym",
        body: "Leg day. ".repeat(200),
        updatedAt: new Date(2026, 9, 5, 18).getTime(),
      },
    ],
    {
      notesWritten: 1,
      tasksDone: 2,
      tasksPending: 1,
      pendingTaskTexts: ["Buy milk"],
      totalSpent: 2340,
      currency: "₹",
      topCategories: [{ category: "Food & Dining", amount: 1200 }],
      habitsChecked: 4,
      activeStreaks: 1,
    },
    "October 5 – 11, 2026",
  );
  expect(system).toContain("moodByDay");
  expect(system).toContain("Never invent");
  expect(user).toContain("October 5 – 11, 2026");
  expect(user).toContain("## Monday — Gym");
  expect(user).toContain("Buy milk");
  expect(user).toContain("₹2,340");
  // Body got truncated with an ellipsis
  expect(user).toContain("…");
});

test("buildDigestPrompt caps notes at 30", () => {
  const notes = Array.from({ length: 40 }, (_, i) => ({
    title: `N${i}`,
    body: "x",
    updatedAt: Date.now(),
  }));
  const { user } = buildDigestPrompt(
    notes,
    {
      notesWritten: 40,
      tasksDone: 0,
      tasksPending: 0,
      pendingTaskTexts: [],
      totalSpent: 0,
      currency: "₹",
      topCategories: [],
      habitsChecked: 0,
      activeStreaks: 0,
    },
    "W",
  );
  expect(user).toContain("— N29");
  expect(user).not.toContain("— N30");
});

test("sanitizeDigestResponse parses a good reply and clamps scores", () => {
  const dates = ["2026-10-05", "2026-10-06"];
  const ai = sanitizeDigestResponse(
    '```json\n{"summary":"Great week.","moodByDay":[{"date":"2026-10-05","score":9,"label":"Electric Vibes Here"},{"date":"2026-10-06","score":2,"label":"drained"}],"keyMoments":["Ran far","Ate well","Slept","x","y","z"]}\n```',
    dates,
  );
  expect(ai.summary).toBe("Great week.");
  expect(ai.moodByDay[0]).toEqual({ date: "2026-10-05", score: 5, label: "electric" });
  expect(ai.moodByDay[1].score).toBe(2);
  expect(ai.keyMoments).toHaveLength(5);
});

test("sanitizeDigestResponse fills missing days and survives garbage", () => {
  const dates = ["2026-10-05", "2026-10-06", "2026-10-07"];
  const ai = sanitizeDigestResponse("not json at all {{{", dates);
  expect(ai.moodByDay).toHaveLength(3);
  expect(ai.moodByDay.every((d) => d.score === 3 && d.label === "quiet")).toBe(true);
  expect(ai.summary.length).toBeGreaterThan(0);
  expect(ai.keyMoments).toEqual([]);
});

test("sanitizeDigestResponse ignores unexpected dates", () => {
  const ai = sanitizeDigestResponse(
    JSON.stringify({
      summary: "s",
      moodByDay: [{ date: "1999-01-01", score: 5, label: "wild" }],
      keyMoments: [],
    }),
    ["2026-10-05"],
  );
  expect(ai.moodByDay).toEqual([{ date: "2026-10-05", score: 3, label: "quiet" }]);
});
