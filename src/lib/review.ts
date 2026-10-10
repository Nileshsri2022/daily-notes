/**
 * Pure helpers for the AI weekly review digest. No React imports —
 * unit-tested in tests/review.spec.ts. Imported by convex/review.ts
 * via a relative path (this module is dependency-free, so the Convex
 * bundler handles it), keeping one source of truth for the prompt.
 */
import { dayKey } from "./calendar";

/* ------------------------------------------------------------------ */
/* Week math (Monday-first, ISO-8601 week numbers)                     */
/* ------------------------------------------------------------------ */

/** Monday 00:00 of the week containing d (local time). */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  return new Date(x.getFullYear(), x.getMonth(), x.getDate() - dow);
}

/** "2026-W41" for the week containing d. */
export function weekKeyFor(d: Date): string {
  const monday = startOfWeek(d);
  const thursday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 3,
  );
  const isoYear = thursday.getFullYear();
  const week1Monday = startOfWeek(new Date(isoYear, 0, 4)); // Jan 4 is always in W01
  const week =
    Math.round((monday.getTime() - week1Monday.getTime()) / 604800000) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Monday 00:00 → Sunday 23:59:59.999 for a "YYYY-Www" key. */
export function weekRange(key: string): { start: Date; end: Date } {
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) throw new Error(`Invalid week key: ${key}`);
  const year = Number(m[1]);
  const week = Number(m[2]);
  const week1Monday = startOfWeek(new Date(year, 0, 4));
  const monday = new Date(
    week1Monday.getFullYear(),
    week1Monday.getMonth(),
    week1Monday.getDate() + (week - 1) * 7,
  );
  const end = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
    23,
    59,
    59,
    999,
  );
  return { start: monday, end };
}

/** Shift a week key by n weeks (negative = past). */
export function addWeeks(key: string, n: number): string {
  const { start } = weekRange(key);
  return weekKeyFor(
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + n * 7),
  );
}

/** "October 5 – 11, 2026" (handles month/year boundaries). */
export function weekLabel(key: string): string {
  const { start, end } = weekRange(key);
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startFmt = start.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  const year = end.getFullYear();
  if (sameMonth) return `${startFmt} – ${end.getDate()}, ${year}`;
  const endFmt = end.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt}, ${start.getFullYear()} – ${endFmt}`;
}

/** The 7 day-keys (Mon–Sun) of a week, for mood-bar scaffolding. */
export function weekDayKeys(key: string): string[] {
  const { start } = weekRange(key);
  return Array.from({ length: 7 }, (_, i) =>
    dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)),
  );
}

/* ------------------------------------------------------------------ */
/* Digest data shapes                                                  */
/* ------------------------------------------------------------------ */

export interface WeekNoteInput {
  title: string;
  body: string;
  updatedAt: number; // ms
}

export interface CategoryTotal {
  category: string;
  amount: number;
}

export interface WeekStatsInput {
  notesWritten: number;
  tasksDone: number;
  tasksPending: number;
  pendingTaskTexts: string[];
  totalSpent: number;
  currency: string;
  topCategories: CategoryTotal[];
  habitsChecked: number;
  activeStreaks: number;
}

export interface MoodDay {
  date: string;
  score: number; // 1–5
  label: string;
}

export interface DigestAi {
  summary: string;
  moodByDay: MoodDay[];
  keyMoments: string[];
}

/* ------------------------------------------------------------------ */
/* Task extraction from markdown bodies (mirrors src/lib/tasks.ts)     */
/* ------------------------------------------------------------------ */

export function extractTaskStats(bodies: string[]): {
  done: number;
  pending: number;
  pendingTexts: string[];
} {
  let done = 0;
  const pendingTexts: string[] = [];
  for (const body of bodies) {
    for (const line of body.split("\n")) {
      const m = /^\s*(?:[-*]|\d+\.)\s+\[([ xX])\]\s+(.+?)\s*$/.exec(line);
      if (!m) continue;
      if (m[1].toLowerCase() === "x") done += 1;
      else pendingTexts.push(m[2].trim());
    }
  }
  return { done, pending: pendingTexts.length, pendingTexts };
}

/* ------------------------------------------------------------------ */
/* Prompt builder                                                      */
/* ------------------------------------------------------------------ */

const MAX_NOTES = 30;
const MAX_BODY_CHARS = 600;

export function buildDigestPrompt(
  notes: WeekNoteInput[],
  stats: WeekStatsInput,
  label: string,
): { system: string; user: string } {
  const system = `You are a thoughtful weekly-review companion inside a personal diary app called Dincharya.
You read one week of someone's diary notes and write a short, warm review of their week.

You will receive the week's notes as day-labeled entries, plus computed stats (note counts, tasks, spending) for context.

Respond with ONLY valid JSON in this exact shape:
{
  "summary": "2-4 sentences in second person. Warm, specific, honest. Name what mattered this week — don't be generic.",
  "moodByDay": [
    {"date": "YYYY-MM-DD", "score": 4, "label": "steady"}
  ],
  "keyMoments": ["3-5 short bullets: the week's most meaningful beats, phrased vividly"]
}

Rules:
- Cover all 7 days of the week in moodByDay, in calendar order, using the exact dates given in the notes header.
- Infer mood ONLY from what was written: energy, word choice, events, wins, stressors. A busy productive day isn't automatically happy; a quiet day isn't automatically sad.
- Days with no notes: score 3, label "quiet" — unless surrounding days give real signal.
- Never invent events, people, or feelings not supported by the notes.
- Labels are single lowercase words: steady, drained, glowing, restless, tender, electric, heavy, light.
- The summary should feel like it was written by someone who actually read the diary. Reference specifics.`;

  const trimmed = notes.slice(0, MAX_NOTES).map((n) => {
    const d = new Date(n.updatedAt);
    const dayName = d.toLocaleDateString(undefined, { weekday: "long" });
    const body =
      n.body.length > MAX_BODY_CHARS
        ? n.body.slice(0, MAX_BODY_CHARS) + "…"
        : n.body;
    return `## ${dayName} — ${n.title}\n${body}`;
  });

  const spendBits = stats.topCategories
    .map((c) => `${c.category} ${stats.currency}${c.amount.toLocaleString()}`)
    .join(", ");
  const statsLine =
    `${stats.notesWritten} notes · ` +
    `${stats.tasksDone}/${stats.tasksDone + stats.tasksPending} tasks done · ` +
    `spent ${stats.currency}${stats.totalSpent.toLocaleString()}` +
    (spendBits ? ` (${spendBits})` : "") +
    ` · ${stats.habitsChecked} habit check-ins`;
  const pendingLine =
    stats.pendingTaskTexts.length > 0
      ? `\nUnfinished tasks:\n${stats.pendingTaskTexts
          .slice(0, 12)
          .map((t) => `- ${t}`)
          .join("\n")}`
      : "";

  const user = `Week: ${label}\nStats: ${statsLine}${pendingLine}\n\nNotes:\n${
    trimmed.length > 0 ? trimmed.join("\n\n") : "(no notes this week)"
  }`;

  return { system, user };
}

/* ------------------------------------------------------------------ */
/* Response sanitizer — a malformed model reply never blanks the UI    */
/* ------------------------------------------------------------------ */

const MOOD_LABEL_FALLBACK = "quiet";

export function sanitizeDigestResponse(
  raw: string,
  expectedDates: string[],
): DigestAi {
  let parsed: {
    summary?: unknown;
    moodByDay?: unknown;
    keyMoments?: unknown;
  } = {};
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {};
  }

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 1200)
      : "Your week, in short: the notes are in, but the summary didn't come through this time. Try regenerating.";

  const byDate = new Map<string, MoodDay>();
  if (Array.isArray(parsed.moodByDay)) {
    for (const m of parsed.moodByDay) {
      if (!m || typeof m !== "object") continue;
      const rec = m as Record<string, unknown>;
      const date = typeof rec.date === "string" ? rec.date : "";
      if (!expectedDates.includes(date) || byDate.has(date)) continue;
      const scoreRaw = Number(rec.score);
      const score = Number.isFinite(scoreRaw)
        ? Math.min(5, Math.max(1, Math.round(scoreRaw)))
        : 3;
      const labelRaw =
        typeof rec.label === "string" && rec.label.trim()
          ? rec.label.trim().toLowerCase().split(/\s+/)[0]
          : MOOD_LABEL_FALLBACK;
      byDate.set(date, { date, score, label: labelRaw.slice(0, 20) });
    }
  }
  const moodByDay = expectedDates.map(
    (date) => byDate.get(date) ?? { date, score: 3, label: MOOD_LABEL_FALLBACK },
  );

  const keyMoments = Array.isArray(parsed.keyMoments)
    ? parsed.keyMoments
        .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
        .map((k) => k.trim().slice(0, 300))
        .slice(0, 5)
    : [];

  return { summary, moodByDay, keyMoments };
}
