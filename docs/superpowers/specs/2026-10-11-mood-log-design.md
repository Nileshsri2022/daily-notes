# Design Spec: One-Tap Mood Log

**Date:** 2026-10-11
**Status:** ✅ Implemented & verified 2026-10-11 (spec → build in one session)
**Author:** Pair Programming Agent & User
**Target Project:** Dincharya (`daily-notes`), v1 + responsive + calendar + habits + review + hand-rolled charts

---

## 1. Goal

A daily one-tap mood check-in (😫→🤩, 1–5). The fifth "easy but useful" idea: near-zero friction, one small table, and it upgrades two existing features — mood dots on the calendar, and the Review tab's mood trend switches from AI-inferred to real logged data where available.

**Non-goals:** multi-day backfill UI (tap any calendar day later — future), mood notes/journaling prompts, notifications.

---

## 2. Data Model

```ts
moodLogs: defineTable({
  clerkUserId: v.string(),
  date: v.string(), // local "YYYY-MM-DD", one row per day
  score: v.number(), // 1–5
}).index("by_user_date", ["clerkUserId", "date"]),
```

`convex/moods.ts`: `getDay({date})`, `getRange({startDate, endDate})` (ms range, filters by day-key), `log({date, score})` (upsert — re-tap changes today's mood), `remove({date})`.

## 3. Scale (single source of truth, `src/lib/moods.ts`)

| score | emoji | label   | color     |
|-------|-------|---------|-----------|
| 1     | 😫    | drained | `#A63D2F` |
| 2     | 😕    | low     | `#C46A3D` |
| 3     | 😐    | okay    | `#D99C34` |
| 4     | 🙂    | good    | `#7C9A5C` |
| 5     | 🤩    | great   | `#3E6B4F` |

`moodColor(score)`, `moodLabel(score)`, `mergeMoods(ai, logged)` (logged wins per day). `review.styles.ts` `MOOD_COLORS` now derives from this scale — no duplication.

## 4. UX

- **Feed card** (`MoodCheckin`, top of notes feed ListHeader): "How are you today?" + 5 emoji buttons in a row; tapped = filled circle in the mood color; re-tap another to change. One line, no modal.
- **Calendar**: days with a logged mood get a small mood-colored dot under the note-count dots. `CalendarView` takes an optional `moods` prop; feed queries ~93 days and passes them down.
- **Review tab**: `MoodTrend` queries the week's logged moods and merges — logged days show the real score/label, others fall back to AI inference. The digest prompt additionally receives logged moods as ground truth ("use these exact scores for these dates").

## 5. Verification

- `npx tsc --noEmit` clean; `tests/moods.spec.ts` (scale lookups, clamping, merge precedence).
- Screenshots: feed card (phone), calendar with mood dots, Review with merged moods (mock data in preview copy).
- Full suite green.
