/**
 * Single source of truth for the 1–5 mood scale. No React imports —
 * unit-tested in tests/moods.spec.ts.
 */

export interface MoodLevel {
  score: number;
  emoji: string;
  label: string;
  color: string;
}

export const MOOD_SCALE: MoodLevel[] = [
  { score: 1, emoji: "😫", label: "drained", color: "#A63D2F" },
  { score: 2, emoji: "😕", label: "low", color: "#C46A3D" },
  { score: 3, emoji: "😐", label: "okay", color: "#D99C34" },
  { score: 4, emoji: "🙂", label: "good", color: "#7C9A5C" },
  { score: 5, emoji: "🤩", label: "great", color: "#3E6B4F" },
];

/** Colors indexed by score-1 (kept for the Review mood bars). */
export const MOOD_COLORS: readonly string[] = MOOD_SCALE.map((m) => m.color);

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 3;
  return Math.min(5, Math.max(1, Math.round(score)));
}

export function moodLevel(score: number): MoodLevel {
  return MOOD_SCALE[clampScore(score) - 1];
}

export function moodEmoji(score: number): string {
  return moodLevel(score).emoji;
}

export function moodLabel(score: number): string {
  return moodLevel(score).label;
}

export function moodColor(score: number): string {
  return moodLevel(score).color;
}

export interface DatedMood {
  date: string; // YYYY-MM-DD
  score: number;
  label: string;
}

/**
 * Merge AI-inferred moods with real logged moods: a logged day always wins.
 * Returns one entry per expected date, in order.
 */
export function mergeMoods(
  aiMoods: DatedMood[],
  logged: { date: string; score: number }[],
  expectedDates: string[],
): (DatedMood & { logged: boolean })[] {
  const loggedByDate = new Map(logged.map((l) => [l.date, l.score]));
  const aiByDate = new Map(aiMoods.map((m) => [m.date, m]));
  return expectedDates.map((date) => {
    const loggedScore = loggedByDate.get(date);
    if (loggedScore !== undefined) {
      const level = moodLevel(loggedScore);
      return { date, score: level.score, label: level.label, logged: true };
    }
    const ai = aiByDate.get(date);
    if (ai) return { ...ai, logged: false };
    return { date, score: 3, label: "quiet", logged: false };
  });
}
