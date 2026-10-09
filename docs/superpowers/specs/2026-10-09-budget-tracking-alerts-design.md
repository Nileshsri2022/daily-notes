# Design Spec: $D$-Day Budget Tracking, Overrun Analytics & Resend Email Alerts

**Date:** 2026-10-09  
**Status:** Approved  
**Author:** Pair Programming Agent & User  
**Target Project:** Dincharya (`daily-notes`)

---

## 1. Executive Summary & Problem Statement

Users of personal reflection and daily expense apps need financial discipline:
1. **Pacing & Awareness:** Users need to know whether their daily spending over a customizable period ($D$ days) is sustainable or burning through their funds too fast.
2. **Proactive Alerts:** Once overspending occurs, it is too late. Users need threshold warnings (at 80% and 100%) delivered to their email without needing to open the app.
3. **Historical Accountability:** When a cycle ends, users need visibility into their **Budget Overrun** (or savings surplus) compared against their **Historical Lifetime Average**, rather than just a single previous cycle.
4. **Zero-Friction Continuity:** When a $D$-day cycle concludes, the cycle should automatically roll forward with the same settings if the user takes no action, preventing broken tracking streaks while sending an end-of-cycle summary report.

---

## 2. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Dincharya Client                              │
│                                                                        │
│  [ Expenses Dashboard ]                                                │
│    ├── Accordion 1: 📊 Expenses & Analytics (Donut + Transactions)     │
│    └── Accordion 2: 🎯 Budget & Overrun Tracking                       │
│          ├── Active Cycle Card (Spend, % bar, burn rate, days left)    │
│          ├── 3-Bar Comparison Chart (Target vs Past Avg vs Current)   │
│          ├── Overrun / Surplus Variance Badge                          │
│          └── Set Budget Modal (Amount ₹A, Duration D days)             │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  │ Live Reactive Queries / Mutations
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           Convex Backend                               │
│                                                                        │
│  ├── [expenses.logFromNote] ──> Calculates cycle spend                 │
│  │                              If spend >= 80% or 100% and not alerted│
│  │                              └──> schedules email.sendThresholdAlert│
│  │                                                                     │
│  ├── [ctx.scheduler.runAt(cycleEndDate)]                               │
│  │      └──> processCycleExpiryAndRollover                             │
│  │             ├── Archives completed cycle into budgetCycles          │
│  │             ├── Dispatches Cycle Wrap-Up Report via Resend          │
│  │             └── Auto-starts new D-day cycle with same budget        │
│  │                                                                     │
│  └── [email.ts Action] ───────> POST https://api.resend.com/emails    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Models (`convex/schema.ts`)

Two tables are introduced in Convex:

### 3.1 `userBudgets` (Active Cycle State)
Stores the user's active budget parameters and current cycle window:
```ts
userBudgets: defineTable({
  clerkUserId: v.string(),
  amount: v.number(),             // User-set budget in ₹ (e.g. 10000)
  durationDays: v.number(),       // D days (e.g. 14, 30)
  cycleStartDate: v.number(),     // Unix timestamp (ms) when active cycle began
  cycleEndDate: v.number(),       // cycleStartDate + (durationDays * 86,400,000)
  lastAlertThreshold: v.optional(v.number()), // 80 or 100 to prevent duplicate alerts
}).index("by_user", ["clerkUserId"]),
```

### 3.2 `budgetCycles` (Completed History for Averages)
Archives every finished cycle to compute historical averages and past overruns:
```ts
budgetCycles: defineTable({
  clerkUserId: v.string(),
  budgetAmount: v.number(),       // Budget allocated for that cycle
  durationDays: v.number(),       // Duration in days
  startDate: v.number(),          // Start timestamp
  endDate: v.number(),            // End timestamp
  actualSpent: v.number(),        // Final total spend recorded
  overrun: v.number(),            // actualSpent - budgetAmount (> 0 is overrun, < 0 is surplus)
}).index("by_user", ["clerkUserId"]),
```

---

## 4. Business Logic & Calculations (`convex/budgets.ts`)

### 4.1 Historical Average Calculations
* **Total Completed Cycles:** $N = \text{count}(\text{budgetCycles})$
* **Historical Average Spend:**
  $$\text{avgSpend} = \frac{\sum_{i=1}^{N} \text{actualSpent}_i}{N}$$
* **Historical Average Overrun:**
  $$\text{avgOverrun} = \frac{\sum_{i=1}^{N} \text{overrun}_i}{N}$$
* **Last Cycle Overrun:** $\text{overrun}$ of the most recently ended cycle.

### 4.2 Active Cycle Pacing & Burn Rate
For current active cycle:
* **Days Elapsed:**
  $$\text{daysElapsed} = \min(D, \max(1, \lfloor \frac{\text{now} - \text{cycleStartDate}}{86,400,000} \rfloor + 1))$$
* **Days Remaining:**
  $$\text{daysLeft} = \max(0, D - \text{daysElapsed})$$
* **Current Spend Pace:**
  $$\text{currentPace} = \frac{\text{currentSpent}}{\text{daysElapsed}} \text{ (₹/day)}$$
* **Safe Remaining Daily Budget:**
  $$\text{safeDailySpend} = \frac{\max(0, \text{budgetAmount} - \text{currentSpent})}{\max(1, \text{daysLeft})} \text{ (₹/day)}$$

### 4.3 Anti-Spam Threshold Triggers
In `expenses.logFromNote`:
1. Calculate cumulative spend inside current `[cycleStartDate, cycleEndDate]`.
2. Compute $\text{percentage} = (\text{currentSpent} / \text{budgetAmount}) \times 100$.
3. If $\text{percentage} \ge 80\%$ and `lastAlertThreshold < 80`:
   - Send 80% Warning Email via Resend.
   - Patch `lastAlertThreshold = 80`.
4. If $\text{percentage} \ge 100\%$ and `lastAlertThreshold < 100`:
   - Send 100% Critical Alert Email via Resend.
   - Patch `lastAlertThreshold = 100`.
5. Subsequent purchases while over budget do **not** trigger new emails.

### 4.4 Expiry & Seamless Rollover Scheduling
When a cycle is initialized or renewed:
1. Schedule execution at `cycleEndDate`:
   ```ts
   await ctx.scheduler.runAt(cycleEndDate, internal.budgets.processCycleExpiryAndRollover, { userId });
   ```
2. When triggered:
   - Query all expenses between `cycleStartDate` and `cycleEndDate`.
   - Calculate `overrun = actualSpent - budgetAmount`.
   - Insert record into `budgetCycles`.
   - Dispatch Cycle Wrap-Up Email via Resend.
   - **Auto-rollover:** Update `userBudgets` with `cycleStartDate = cycleEndDate`, `cycleEndDate = cycleEndDate + durationDays * 86,400,000`, `lastAlertThreshold = undefined`.
   - Schedule the next expiry check.

---

## 5. Resend Email Integration (`convex/email.ts`)

Emails are sent using native `fetch()` without additional npm dependencies:
* **Endpoint:** `POST https://api.resend.com/emails`
* **Authorization:** `Bearer ${process.env.RESEND_API_KEY}`
* **Sender:** `Dincharya Alerts <onboarding@resend.dev>`
* **Recipient:** User's Clerk account email (`ctx.auth.getUserIdentity().email` or dev fallback).

### Email Types:
1. **80% Warning Alert:**
   - Subject: `⚠️ Dincharya: 80% of your ₹{amount} budget reached`
   - Highlights days remaining, current spend, and safe daily spend allowance.
2. **100% Limit Breach Alert:**
   - Subject: `🚨 Dincharya: 100% budget limit reached!`
   - Recommends pausing non-essential purchases for remaining $D$ days.
3. **Cycle End Wrap-Up Report:**
   - Subject: `📊 Dincharya: Your {D}-day budget cycle has finished`
   - Reports total spent vs budget, plus exact Overrun (+₹X) or Surplus (-₹Y).
   - Includes action buttons:
     - `[ 🔁 Continue with Same Budget ]`
     - `[ ✏️ Set New Budget on Dashboard ]`

---

## 6. Frontend UI Component Architecture

In [`src/components/expenses-dashboard.tsx`](file:///d:/vscode_programs/diaryNotes/src/components/expenses-dashboard.tsx), add a 2nd Accordion Item:

```tsx
<Accordion type="single" collapsible defaultValue="overview">
  <AccordionItem value="overview">
    {/* Existing Expenses & Analytics (RangePicker, DonutChart, TransactionList) */}
  </AccordionItem>

  <AccordionItem value="budget">
    <AccordionTrigger>
      {/* 🎯 Budget & Overrun Tracking */}
    </AccordionTrigger>
    <AccordionContent>
      {/* 1. Active Cycle Pacing Card */}
      <BudgetActiveCard
        budget={budget}
        currentSpent={currentSpent}
        daysElapsed={daysElapsed}
        daysLeft={daysLeft}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <Separator style={styles.sectionDivider} />

      {/* 2. Target vs Past Avg vs Current Bar Chart */}
      <BudgetComparisonChart
        targetBudget={budget.amount}
        historicalAvgSpent={historicalAvgSpent}
        currentSpent={currentSpent}
        currencySymbol={currencySymbol}
      />

      {/* 3. Historical Overrun Callouts */}
      <BudgetOverrunSummary
        lastCycleOverrun={lastCycleOverrun}
        historicalAvgOverrun={historicalAvgOverrun}
        currencySymbol={currencySymbol}
      />
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

### Subcomponents in `src/components/expenses/`:
1. `budget-active-card.tsx`: Progress bar with color shift (🟢 <70%, 🟡 70–99%, 🔴 100%+), days countdown, and safe daily spend.
2. `budget-comparison-chart.tsx`: 3-bar comparison chart using `react-native-gifted-charts`:
   - Bar 1: **Target Budget** (Neutral / Primary)
   - Bar 2: **Past Avg Spend** (Amber / Slate)
   - Bar 3: **Current Cycle Spend** (Emerald / Red if over)
3. `budget-overrun-summary.tsx`: Callout badges displaying Last Cycle Overrun and Lifetime Average Overrun.
4. `budget-settings-modal.tsx`: Dialog to adjust Amount (₹) and Duration ($D$ days).

---

## 7. Verification & Success Criteria

1. **Type Safety:** `npx tsc --noEmit` passes with 0 errors across frontend and backend.
2. **Automated Unit Tests:** Add unit tests in `tests/budgets.spec.ts` covering:
   - Days elapsed & remaining calculation.
   - Pacing and daily safe spend formulas.
   - Overrun and historical average calculations.
   - Threshold crossing detection logic.
3. **Execution Verification:** `npm test` passes 100%.
4. **Dev Server Verification:** UI renders both accordion sections cleanly on web dev server (`http://localhost:8081`).
