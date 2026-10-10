# Design Spec: Calendar View for Notes

**Date:** 2026-10-10
**Status:** Draft (awaiting build go-ahead)
**Author:** Pair Programming Agent & User
**Target Project:** Dincharya (`daily-notes`), v1 cleaned codebase + responsive system

---

## 1. Executive Summary & Problem Statement

Dincharya is a diary app, but it has no way to navigate by date. Today a user asking "what did I write on October 2nd?" must scroll the feed or guess search terms. Every serious diary app (Day One, Journey) treats the calendar as primary navigation — entries are memories, and memories are indexed by time.

**Goal:** a month-grid calendar where days with entries are visually marked; tapping a day shows that day's notes. No new backend tables, no new dependencies.

**Non-goals for this spec:** week/year views, creating notes from the calendar, recurring-event logic, locale configuration UI.

---

## 2. Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Dincharya Client                         │
│                                                              │
│  [ Feed (src/app/index.tsx) ]                                │
│    └── Tab 4: 📅 Calendar (new)                              │
│          └── <CalendarView />                                │
│                ├── Month grid (7 cols, Mon start)            │
│                │     └── Day cells: dots ∝ note count       │
│                ├── Selected-day note list (compact rows)     │
│                └── Desktop: grid + list side-by-side         │
│                                                              │
│  [ src/lib/calendar.ts ]  (new, pure date math, unit-tested) │
│    ├── getMonthGrid(year, month, weekStart)                  │
│    ├── dayKey(date) -> "YYYY-MM-DD"                          │
│    └── groupNotesByDay(notes) -> Map<dayKey, Note[]>          │
└──────────────────────────┬───────────────────────────────────┘
                           │ useQuery (existing, no new fn)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                      Convex Backend                          │
│   api.notes.list  (already returns updatedAt per note)        │
└──────────────────────────────────────────────────────────────┘
```

No schema change. No new Convex functions. The calendar derives everything client-side from the existing `api.notes.list` query (memoized).

---

## 3. Data Model

**No changes to `convex/schema.ts`.**

Day grouping uses each note's `updatedAt` timestamp truncated to the calendar day in the device's local timezone.

**Known limitation (documented, accepted for v1):** editing an old note moves it to the edit day, since the schema has no immutable entry date. Follow-up (out of scope): add optional `entryDate`/`createdAt` to new notes and prefer it when present. The `groupNotesByDay` helper takes a date-selector function so this swap is a one-line change later.

Soft-deleted notes (`deletedAt` set) are excluded, matching feed behavior.

---

## 4. UX Design

### 4.1 Month grid
- Header row: `‹ October 2026 ›` with chevron buttons + a "Today" pill that jumps back to the current month.
- Weekday header: `M T W T F S S` (Monday start; `WEEK_START = 1` const in `src/lib/calendar.ts`).
- 42 cells max (6 rows × 7); leading/trailing days from adjacent months rendered dimmed and non-interactive.
- Day cell content:
  - date number (dimmed for adjacent-month days)
  - **today:** ring/outline in `colors.primary`
  - **has notes:** dot(s) under the number — 1 dot for 1–2 notes, 2 dots for 3–5, 3 dots for 6+ (`colors.primary`, 4px)
  - **selected:** filled `colors.primary` background, white number
- Month change: chevrons only (no swipe) for v1 — keeps gesture conflicts with the drawer at zero.

### 4.2 Selected-day panel
- Below the grid (phone) or beside it (desktop, see §6).
- Compact rows: note title (1 line, `numberOfLines={1}`), time (`h:mm a`), status badge; tapping a row → `router.push("/note/[id]")`.
- Empty day: muted text — "No entries this day." (no CTA; creation stays on the FAB to keep one creation path).
- Header: "Friday, October 10 · 3 notes".

### 4.3 Placement
Fourth tab in the feed (`mainTab: "notes" | "tasks" | "expenses" | "calendar"`) plus a matching **Calendar** entry under the sidebar VIEWS group — the same pattern the other three views use. No new route, no navigation restructuring.

---

## 5. Components & Files

### New
| File | Purpose |
| :--- | :--- |
| `src/components/calendar-view.tsx` | `CalendarView({ notes })` — month state, grid, selection, day list. Receives the already-fetched notes (feed owns the query). |
| `src/styles/calendar.styles.ts` | All calendar styles, per the v1 convention (no in-component `StyleSheet.create`). |
| `src/lib/calendar.ts` | Pure helpers: `getMonthGrid`, `dayKey`, `groupNotesByDay`, `WEEK_START`. Zero React imports — unit-testable. |
| `tests/calendar.spec.ts` | Unit tests: grid shape for a known month (Oct 2026), leap-year February, `dayKey` formatting, grouping incl. deleted-note exclusion. |

### Modified
| File | Change |
| :--- | :--- |
| `src/app/index.tsx` | Extend tab union with `"calendar"`; add tab UI + sidebar menu item; render `<CalendarView notes={notes} />` for the tab. Reuse existing `bottomInset` handling. |
| `src/styles/feed.styles.ts` | Only if tab-bar styles need a 4th-tab tweak (4 tabs must fit 320px — labels may need shortening to icons+short labels on phone). |

### Explicitly not created
No new Convex functions, no schema migration, no new npm dependencies, no new route file.

---

## 6. Responsive Behavior (uses the existing `useBreakpoints` hook)

- **Phone (<600):** grid on top, selected-day list below in the same scroll. 4th tab fits by using compact tab labels.
- **Tablet (600–1023):** same stacked layout, grid constrained to `maxContentWidth` like the rest of the feed.
- **Desktop (≥1024):** two-column — month grid left (fixed ~380px), selected-day list right (flex). Both inside the centered content column; persistent sidebar unchanged.

---

## 7. Accessibility

- Each day cell: `accessibilityRole="button"`, label `"October 10, 3 notes"` / `"October 11, no notes"`.
- Chevron buttons labeled "Previous month" / "Next month".
- Selected/today states must not rely on color alone (selected = filled background + bold number; today = ring + bold).

---

## 8. Verification Plan

1. `npx tsc --noEmit` — 0 errors.
2. `npx playwright test tests/calendar.spec.ts` — new date-math tests green; full suite stays 20+ passing.
3. Web export + screenshots at 390px and 1440px: dots render on entry days, tapping a day updates the list, desktop shows side-by-side, phone stacks.
4. Manual: month chevrons, Today pill, adjacent-month days non-interactive, deleted notes excluded.

---

## 9. Effort Estimate & Order

1. `src/lib/calendar.ts` + tests — small, independently verifiable.
2. `src/styles/calendar.styles.ts` + `src/components/calendar-view.tsx` — medium.
3. `src/app/index.tsx` wiring (tab + sidebar item) — small.
4. Screenshots + verification — small.

**Out of scope / future:** expense-amount dots on the grid (needs `api.expenses.list` join — natural v2), week view, `entryDate` schema field, creating a note pre-dated from a day cell.
