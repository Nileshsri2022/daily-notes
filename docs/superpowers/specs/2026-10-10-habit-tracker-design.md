# Design Spec: Habit Tracker with Streaks

**Date:** 2026-10-10
**Status:** ✅ Implemented & verified 2026-10-10 (spec → build in one session)
**Author:** Pair Programming Agent & User
**Target Project:** Dincharya (`daily-notes`), v1 cleaned codebase + responsive system + calendar view

---

## 1. Executive Summary & Problem Statement

The app is named *Dincharya* — Sanskrit for "daily routine" — yet it tracks no routines. Users journaling about gym, reading, or meditation have no loop for the behavior itself: no daily check-in, no streak, no at-a-glance adherence.

**Goal:** daily habits with one-tap check-ins, streak counts, and a 7-day adherence strip — inside the diary loop, next to notes, tasks, and expenses.

**Non-goals:** weekly/monthly frequencies, habit reminders/notifications, social/sharing, habit templates.

---

## 2. Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Dincharya Client                         │
│                                                              │
│  [ Feed (src/app/index.tsx) ]                                │
│    └── Tab 5: 🌱 Habits (new)                                │
│          └── <HabitsView />                                  │
│                ├── Habit cards: icon, name, 🔥 streak        │
│                ├── 7-day strip (tap any day to toggle)       │
│                ├── Big "Done today" toggle per habit         │
│                └── + New habit modal (name, emoji, color)   │
│                                                              │
│  [ src/lib/habits.ts ]  (new, pure streak math, unit-tested) │
│    ├── currentStreak(checkKeys, today)                       │
│    └── last7Days(checkKeys, today)                           │
│  (reuses dayKey() from src/lib/calendar.ts)                  │
└──────────────────────────┬───────────────────────────────────┘
                           │ useQuery / useMutation (new fns)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                      Convex Backend                          │
│   habits        (clerkUserId, name, icon, color, createdAt)   │
│   habitChecks   (habitId, clerkUserId, date "YYYY-MM-DD")     │
│   habits.ts: list / create / toggleCheck / removeHabit       │
└──────────────────────────────────────────────────────────────┘
```

**Deploy note:** new backend functions require one `npx convex dev` sync (the normal dev flow) before the tab works against a real deployment.

---

## 3. Data Model (`convex/schema.ts`)

```ts
habits: defineTable({
  clerkUserId: v.string(),
  name: v.string(),
  icon: v.optional(v.string()),   // emoji, e.g. "🏃"
  color: v.optional(v.string()),  // hex from curated palette
  createdAt: v.number(),
}).index("by_user", ["clerkUserId"]),

habitChecks: defineTable({
  habitId: v.id("habits"),
  clerkUserId: v.string(),
  date: v.string(),               // local "YYYY-MM-DD" day key
  createdAt: v.number(),
})
  .index("by_habit", ["habitId"])
  .index("by_user_date", ["clerkUserId", "date"]),
```

One check per (habit, day) — enforced by lookup-then-toggle in the mutation (no unique-constraint primitive needed). `toggleCheck` is idempotent: existing check → delete, missing → insert. `removeHabit` deletes the habit and its checks.

`convex/_generated/api.d.ts` is hand-edited to register the `habits` module (normally done by `npx convex dev`).

---

## 4. Streak Math (`src/lib/habits.ts`)

- `currentStreak(keys, today)`: consecutive checked days ending **today, or yesterday** (grace day — a streak started yesterday and not yet done today is still alive at 1, not 0). A gap anywhere breaks the run.
- `last7Days(keys, today)`: 7 entries oldest-first with `{ key, date, checked }` for the strip.
- Server stays thin: `list` returns each habit's recent check day-keys (last 500); streaks compute client-side so the math is unit-testable without a backend.

---

## 5. UX Design

### Habit card
- Left: icon in a tinted circle (habit color at 15% + colored emoji/text).
- Middle: name (1 line), below it the 7-day strip — 7 dots labeled M T W T F S S; filled = checked. Tapping any dot toggles that day (backfill up to 6 days back).
- Right: streak readout `🔥 12` (muted `—` when 0) + a large circular "Done today" check button (filled primary when checked).

### Add-habit modal
- Name `TextInput` (required, max ~40 chars).
- Emoji row: curated 10 (`🏃📖🧘💧🏋️🎯📝💤🚶🎨`), single-select.
- Color row: 6 dots from the theme accent palette, single-select.
- Save → `habits.create`, modal closes, list updates reactively.

### States
- Empty: "No habits yet. Build your dincharya — add your first habit." + prominent add button.
- Loading: skeletons (same pattern as feed).
- This tab renders immediately like Calendar (no backend needed for chrome); list fills when the query resolves.

### Placement
Fifth feed tab + 🌱 **Habits** sidebar entry under VIEWS — same pattern as Notes/Action Items/Analytics/Calendar.

---

## 6. Responsive Behavior

- Phone/tablet: cards full-width in the centered column (existing feed constraints).
- Desktop: two-column card grid (`flexWrap: "wrap"`, cards `flexBasis: "48%"`) — same pattern as the calendar legend.

---

## 7. Accessibility

- Today toggle: `accessibilityRole="checkbox"`, `accessibilityState={{ checked }}`, label `"Mark Gym done today"`.
- Day dots: label `"Mark Gym done on Friday, October 9"`.
- Streak text exposed as plain text (not emoji-only).

---

## 8. Verification Plan

1. `npx tsc --noEmit` — 0 errors.
2. `npx playwright test tests/habits.spec.ts` — streak edge cases: consecutive run, gap breaks, yesterday-grace, empty set, today-missing.
3. Screenshots at 390px / 1440px of the Habits tab (mock data in an isolated preview copy — backend functions can't deploy from this environment).
4. Full suite stays green.

---

## 9. Out of Scope / Future

Weekly/monthly frequencies, reminder notifications, streak freeze / repair, habit notes linking (tap a checked day → that day's diary notes — natural tie-in with the calendar view), export.
