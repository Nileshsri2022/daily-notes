# Design Spec: AI Weekly Review Digest

**Date:** 2026-10-10
**Status:** Draft (build authorized — implementing)
**Author:** Pair Programming Agent & User
**Target Project:** Dincharya (`daily-notes`), v1 cleaned codebase + responsive + calendar + habits

---

## 1. Executive Summary & Problem Statement

Dincharya collects rich daily data — diary notes (incl. AI voice notes), expenses by category, action-item checkboxes, habit check-ins — but never reflects it back. The week disappears into the feed.

**Goal:** a "Sunday card" — a weekly digest screen summarizing the last 7 days: AI-written narrative, mood trend inferred from note content, spend stats, unfinished tasks. Differentiated vs. plain analytics because the *narrative* is generated, not just charted.

**Non-goals:** push/email delivery of the digest, multi-week comparisons, mood manual entry, editing past digests.

---

## 2. Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Dincharya Client                         │
│  [ Feed ] → Tab 6: 📰 Review                                 │
│    └── <ReviewView />                                        │
│          ├── Week navigator ‹ Oct 5 – 11 ›                    │
│          ├── Cached digest card (or Generate CTA)             │
│          ├── Stats row · mood bars · category bars            │
│          ├── Unfinished tasks · key moments                   │
│          └── Regenerate button                               │
│  [ src/lib/review.ts ] (pure, unit-tested)                    │
│    ├── weekKeyFor / weekRange / addWeeks (Mon–Sun weeks)      │
│    ├── buildDigestPrompt(weekData)                            │
│    └── sanitizeDigestResponse(raw) → DigestAi                 │
└──────────────────────────┬───────────────────────────────────┘
                           │ query / action
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                      Convex Backend                          │
│  weeklyDigests table (clerkUserId, weekKey, generatedAt,      │
│                       model, stats, ai)                      │
│  review.ts:                                                  │
│    ├── getDigest (query, cached per weekKey)                  │
│    └── generateDigest (action):                              │
│          1. internal.getWeekData → notes (truncated) +        │
│             expenses + task counts for the Mon–Sun range      │
│          2. empty week → return { empty: true } (no LLM cost) │
│          3. buildDigestPrompt → OpenAI-compatible /chat       │
│             (same AI_BASE_URL / AI_API_KEY pattern as ai.ts)  │
│          4. sanitize → internal.saveDigest → return digest    │
└──────────────────────────────────────────────────────────────┘
```

**Shared-code note:** `convex/review.ts` imports pure helpers from `../src/lib/review` (relative import; that module is dependency-free so the Convex bundler handles it). One source of truth for the prompt.

**Deploy note:** `npx convex dev` syncs the new functions + table, as with habits.

---

## 3. Data Model

```ts
weeklyDigests: defineTable({
  clerkUserId: v.string(),
  weekKey: v.string(), // "2026-W41" (Monday of the week)
  generatedAt: v.number(),
  model: v.string(),
  stats: v.object({
    notesWritten: v.number(),
    tasksDone: v.number(),
    tasksPending: v.number(),
    totalSpent: v.number(),
    currency: v.string(),
    topCategories: v.array(v.object({ category: v.string(), amount: v.number() })),
    habitsChecked: v.number(),   // habit check-ins that week
    activeStreaks: v.number(),   // habits with streak ≥ 2
  }),
  ai: v.object({
    summary: v.string(),                       // 2–4 sentence narrative
    moodByDay: v.array(v.object({
      date: v.string(),                        // YYYY-MM-DD
      score: v.number(),                       // 1–5
      label: v.string(),                       // e.g. "drained", "steady", "glowing"
    })),
    keyMoments: v.array(v.string()),           // 3–5 bullets
  }),
}).index("by_user_week", ["clerkUserId", "weekKey"]),
```

Stats are computed deterministically server-side (no LLM needed); only the narrative/mood/moments come from the model. `saveDigest` upserts per (user, weekKey) — regenerating overwrites.

`convex/_generated/api.d.ts` hand-edited to register the `review` module.

---

## 4. The Prompt (the differentiator)

System: *"You are a thoughtful weekly-review companion for a personal diary app…"*
User payload: the week's notes as `## <Day> — <title>\n<body…>` blocks (truncated, max ~30 notes), plus computed stats as context (not for the model to recompute).

Requested JSON:
```json
{
  "summary": "2-4 sentences, warm, specific, second person",
  "moodByDay": [{"date": "2026-10-05", "score": 4, "label": "steady"}],
  "keyMoments": ["…"]
}
```

Rules in the prompt: infer mood from what was *written* (energy, word choice, events) — mark days with no notes as score 3/"quiet" only if truly no signal; never invent events; keep labels to one evocative word. Temperature 0.5 for consistency.

`sanitizeDigestResponse`: strips code fences, JSON-parses, clamps scores to 1–5, coerces lengths, falls back to a neutral digest (summary = first-lines fallback) so a malformed model reply never blanks the screen.

---

## 5. UX Design

### Review screen
- **Week navigator:** `‹` `October 5 – 11, 2026` `›` — future weeks disabled; current week labeled "This week".
- **Sunday nudge:** if today is Sunday and this week's digest isn't generated, the Generate card is highlighted ("Your week in review is ready ✨").
- **Digest card:**
  - AI summary paragraph (serif-ish body, quoted styling).
  - Stats row: `📝 8 notes` · `✅ 5/9 tasks` · `💸 ₹2,340` · `🔥 3 habits active`.
  - **Mood trend:** 7 vertical bars (Mon–Sun), height ∝ score, color scale (clay → amber → sage), day letter under each, label on the selected/today bar. Tapping a bar shows its label.
  - **Top spend:** up to 3 horizontal category bars with amounts.
  - **Unfinished tasks:** plain list of pending task texts (from the week's notes), capped at 8 with "+N more".
  - **Key moments:** bullet list from the AI.
  - Footer: "Generated Oct 12 · gpt-oss-20b" + **Regenerate** (confirm not needed; overwrites).
- **Empty week:** "Nothing to review — no notes or expenses this week." (no Generate button; nothing to send the model).
- **No API key:** friendly error on generate — "Set EXPO_PUBLIC_AI_API_KEY…" (same pattern as AI notes).

### Placement
Sixth feed tab + 📰 **Review** sidebar entry under VIEWS. Tab renders immediately (navigator + skeletons/CTA) like Calendar/Habits.

---

## 6. Responsive Behavior

- Phone/tablet: single centered column (existing feed constraints).
- Desktop: digest card max-width centered; stats row wraps; mood bars full-width.

---

## 7. Accessibility

- Mood bars: `accessibilityRole="text"`, label `"Monday: steady, 4 out of 5"`.
- Generate/Regenerate buttons labeled; week navigator chevrons labeled "Previous week"/"Next week".

---

## 8. Verification Plan

1. `npx tsc --noEmit` — 0 errors.
2. `npx playwright test tests/review.spec.ts` — week keys (Mon start, year boundary, addWeeks), prompt contains truncated notes + stats, sanitizer clamps/fallbacks.
3. Screenshots at 390px / 1440px (mock digest in isolated preview copy — no LLM key in this environment).
4. Full suite stays green.

---

## 9. Out of Scope / Future

Scheduled Sunday push/email, week-over-week deltas ("spent 20% less than last week"), manual mood check-ins feeding the trend, sharing the digest as an image.
