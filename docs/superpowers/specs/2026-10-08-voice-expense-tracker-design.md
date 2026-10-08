# Design Specification: AI Voice-First Expense Tracker

**Date:** 2026-10-08  
**Status:** Approved  
**Author:** Pair Programming Agent & User  
**Target Subsystem:** DiaryNotes AI Voice Capture & Sidebar Analytics  

---

## 1. Overview & Goals

DiaryNotes currently supports rich markdown notes, AI voice transcription, and interactive action item checklists. This feature adds an **AI Voice-First Expense Tracker** that automatically detects, calculates, and categorizes financial expenditures spoken during AI Voice Notes (`/ai-note`), and provides a dedicated **Expenses Dashboard** in the app's sidebar featuring an interactive circular Donut Chart (`react-native-gifted-charts`).

### Key Goals
- **Zero Manual Forms:** All tracking begins directly from natural spoken voice memos.
- **Automated Intelligence:** AI extracts individual expense line items, maps them to 8 fixed categories, and sums totals.
- **Dedicated Sidebar View:** Seamlessly toggle between "Notes", "Action Items", and "Expenses" in the existing collapsible sidebar.
- **Visual Analytics:** Interactive circular Donut chart displaying monthly spend distribution with category breakdown and deep links to source voice notes.
- **Lifecycle Integrity:** Respects note soft-deletion and permanent trash purging.

---

## 2. Fixed Categories & Mapping

All extracted expenditures map to one of 8 standardized categories:

| Category | Icon | Description & Scope |
| :--- | :---: | :--- |
| **Food & Dining** | 🍔 | Groceries, restaurants, coffee shops, takeout, food delivery |
| **Transportation** | 🚗 | Cabs, rideshares (Uber/Lyft), fuel/gas, public transit, flights, parking |
| **Shopping** | 🛍️ | Apparel, gadgets, electronics, home essentials, personal care |
| **Bills & Subscriptions** | 💡 | Utilities, rent, internet, mobile recharge, SaaS/streaming services |
| **Health & Wellness** | 🩺 | Pharmacy, doctor visits, gym memberships, sports, dental |
| **Entertainment** | 🍿 | Movies, concerts, gaming, outings, recreational activities |
| **Work & Education** | 📚 | Courses, textbooks, office supplies, developer/work tools |
| **General / Other** | 📦 | Miscellaneous purchases, gifts, unclassified expenditures |

---

## 3. Data Model & Backend Architecture

### 3.1 Convex Schema (`convex/schema.ts`)

New table `expenses` with user, note, and date indexes:

```typescript
expenses: defineTable({
  userId: v.string(),
  noteId: v.id("notes"),
  amount: v.number(),
  currency: v.string(),
  item: v.string(),
  category: v.union(
    v.literal("Food & Dining"),
    v.literal("Transportation"),
    v.literal("Shopping"),
    v.literal("Bills & Subscriptions"),
    v.literal("Health & Wellness"),
    v.literal("Entertainment"),
    v.literal("Work & Education"),
    v.literal("General / Other")
  ),
  date: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "date"])
  .index("by_note", ["noteId"])
  .index("by_user_category", ["userId", "category"])
```

### 3.2 Convex API (`convex/expenses.ts`)

- `list(ctx, { month?: number, year?: number })`: Queries active expenses for the current user. Filters out expenses whose associated note is soft-deleted (`deletedAt !== undefined`).
- `getSummary(ctx)`: Computes total spent this month, total all-time, and category breakdown aggregates (total per category and percentage of whole).
- `logFromNote(ctx, { noteId, expenses })`: Atomic mutation inserting all extracted expenses when a voice note is saved.
- `removeByNote(ctx, { noteId })`: Internal mutation invoked during note purge to delete cascading expense records.

### 3.3 Enhanced AI Prompt & Action (`convex/ai.ts`)

The `generateNote` action prompt is updated to parse monetary amounts and return structured expense JSON alongside note title, markdown body, and tags:

```json
{
  "title": "Evening Walk & Dinner",
  "body": "## Notes\n...\n\n## Expenses\n- 🍔 Dinner at Chipotle: $15.50\n- 🚗 Uber ride home: $22.00\n\n**Total:** $37.50",
  "tags": ["personal", "dining"],
  "expenses": [
    {
      "item": "Dinner at Chipotle",
      "amount": 15.50,
      "category": "Food & Dining",
      "currency": "$"
    },
    {
      "item": "Uber ride home",
      "amount": 22.00,
      "category": "Transportation",
      "currency": "$"
    }
  ],
  "totalExpenses": 37.50
}
```

If no expenses are mentioned in the transcript, `expenses` evaluates to `[]` and `totalExpenses` to `0`.

---

## 4. Frontend & User Interface Architecture

### 4.1 Sidebar Integration (`src/components/ui/sidebar.tsx` & `src/app/index.tsx`)

The collapsible sidebar (`SidebarMenu`) includes three core navigation options under `VIEWS`:
1. 📝 **Notes** (count of active notes)
2. ✅ **Action Items** (count of pending checkboxes)
3. 💳 **Expenses** (badge displaying total spent this month, e.g., `"$485"`)

### 4.2 Main Screen Routing (`src/app/index.tsx`)

`mainTab` state is expanded to `"notes" | "tasks" | "expenses"`. Switching tabs updates the view instantly inside the primary 640px max-width container without route reloads.

### 4.3 Expenses Dashboard View (`src/components/expenses-dashboard.tsx`)

When `mainTab === "expenses"`:
1. **Header & Summary Card**:
   - Month and Year selector (defaults to current month).
   - Prominent **Circular Donut Chart** (`<PieChart donut />` from `react-native-gifted-charts`).
   - Center circle of the Donut renders bold total spending (e.g. `"$485.00"`).
   - Slices styled with distinctive category palette colors:
     - Food & Dining: `#10B981` (Emerald)
     - Transportation: `#0EA5E9` (Sky)
     - Shopping: `#F59E0B` (Amber)
     - Bills & Subscriptions: `#8B5CF6` (Violet)
     - Health & Wellness: `#EC4899` (Pink)
     - Entertainment: `#F43F5E` (Rose)
     - Work & Education: `#6366F1` (Indigo)
     - General / Other: `#64748B` (Slate)
2. **Category Breakdown Grid / List**:
   - Interactive list of categories with icon, category name, dollar total, and percentage share.
   - Tapping a category toggles a filter on the transaction list below.
3. **Voice-Extracted Transactions Feed**:
   - Chronological list of individual expense items.
   - Shows item description, category badge, date, amount, and `↗ View Note` link pointing to `/note/[id]`.
4. **Empty State**:
   - Informative card when zero expenses are recorded, guiding user to record an AI Voice Note.

---

## 5. External Dependencies

- `react-native-gifted-charts`: Cross-platform chart engine supporting Donut (`PieChart`), Bar, and Line charts.
- `react-native-svg`: Required peer dependency for SVG rendering on React Native and Web.

---

## 6. Testing & Validation Plan

1. **AI Extraction Verification**:
   - Test voice transcripts with multiple expenses: *"Spent $12 on lunch, $5 on coffee, and $45 for groceries"*.
   - Verify correct categorization and mathematical summation ($62.00).
   - Test transcripts without expenses to ensure `expenses: []`.
2. **Convex Data Sync**:
   - Verify records are created in `expenses` table upon saving voice note.
   - Verify soft-deleted notes hide expenses from the dashboard.
   - Verify permanent note purge deletes linked expenses.
3. **Cross-Platform Chart Rendering**:
   - Verify circular Donut chart renders cleanly in Expo Web and on mobile viewports.
   - Verify center text displays correctly without overflow.
4. **Sidebar & Navigation Flow**:
   - Test toggling sidebar with `Ctrl+B` and the book icon button.
   - Verify clicking "Expenses" displays dashboard and updates badge totals reactively.
