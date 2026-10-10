import { test, expect } from "@playwright/test";
import {
  MOOD_COLORS,
  MOOD_SCALE,
  mergeMoods,
  moodColor,
  moodEmoji,
  moodLabel,
  moodLevel,
} from "../src/lib/moods";

test("scale has 5 levels, ordered", () => {
  expect(MOOD_SCALE).toHaveLength(5);
  expect(MOOD_SCALE.map((m) => m.score)).toEqual([1, 2, 3, 4, 5]);
  expect(MOOD_COLORS).toHaveLength(5);
});

test("lookups return the right level", () => {
  expect(moodLevel(5)).toMatchObject({ emoji: "🤩", label: "great" });
  expect(moodEmoji(1)).toBe("😫");
  expect(moodLabel(4)).toBe("good");
  expect(moodColor(3)).toBe("#D99C34");
});

test("out-of-range scores clamp", () => {
  expect(moodLevel(0).score).toBe(1);
  expect(moodLevel(9).score).toBe(5);
  expect(moodLevel(2.6).score).toBe(3);
  expect(moodLevel(NaN).score).toBe(3);
});

test("mergeMoods prefers logged over AI", () => {
  const merged = mergeMoods(
    [
      { date: "2026-10-05", score: 2, label: "drained" },
      { date: "2026-10-06", score: 4, label: "steady" },
    ],
    [{ date: "2026-10-05", score: 5 }],
    ["2026-10-05", "2026-10-06", "2026-10-07"],
  );
  expect(merged).toEqual([
    { date: "2026-10-05", score: 5, label: "great", logged: true },
    { date: "2026-10-06", score: 4, label: "steady", logged: false },
    { date: "2026-10-07", score: 3, label: "quiet", logged: false },
  ]);
});

test("mergeMoods clamps logged scores", () => {
  const merged = mergeMoods([], [{ date: "2026-10-05", score: 99 }], [
    "2026-10-05",
  ]);
  expect(merged[0].score).toBe(5);
  expect(merged[0].logged).toBe(true);
});
