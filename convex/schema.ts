import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notes: defineTable({
    clerkUserId: v.string(),
    title: v.string(),
    body: v.string(),
    format: v.optional(v.union(v.literal("markdown"), v.literal("html"))),
    coverStorageId: v.optional(v.id("_storage")),
    tags: v.optional(v.array(v.string())),
    pinned: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("published")),
    updatedAt: v.number(),
  }).index("by_user", ["clerkUserId", "updatedAt"]),

  weeklyDigests: defineTable({
    clerkUserId: v.string(),
    weekKey: v.string(), // "2026-W41" (Monday of the week)
    generatedAt: v.number(),
    model: v.string(),
    stats: v.object({
      notesWritten: v.number(),
      tasksDone: v.number(),
      tasksPending: v.number(),
      pendingTasks: v.array(v.string()),
      totalSpent: v.number(),
      currency: v.string(),
      topCategories: v.array(
        v.object({ category: v.string(), amount: v.number() }),
      ),
      habitsChecked: v.number(),
      activeStreaks: v.number(),
    }),
    ai: v.object({
      summary: v.string(),
      moodByDay: v.array(
        v.object({ date: v.string(), score: v.number(), label: v.string() }),
      ),
      keyMoments: v.array(v.string()),
    }),
  }).index("by_user_week", ["clerkUserId", "weekKey"]),

  moodLogs: defineTable({
    clerkUserId: v.string(),
    date: v.string(), // local "YYYY-MM-DD", one row per day
    score: v.number(), // 1–5
  }).index("by_user_date", ["clerkUserId", "date"]),

  habits: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["clerkUserId"]),

  habitChecks: defineTable({
    habitId: v.id("habits"),
    clerkUserId: v.string(),
    date: v.string(), // local "YYYY-MM-DD" day key
    createdAt: v.number(),
  })
    .index("by_habit", ["habitId"])
    .index("by_user_date", ["clerkUserId", "date"]),

  expenses: defineTable({
    clerkUserId: v.string(),
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
    .index("by_user", ["clerkUserId"])
    .index("by_user_date", ["clerkUserId", "date"])
    .index("by_note", ["noteId"])
    .index("by_user_category", ["clerkUserId", "category"]),

  userBudgets: defineTable({
    clerkUserId: v.string(),
    amount: v.number(),
    durationDays: v.number(),
    cycleStartDate: v.number(),
    cycleEndDate: v.number(),
    lastAlertThreshold: v.optional(v.number()),
  }).index("by_user", ["clerkUserId"]),

  budgetCycles: defineTable({
    clerkUserId: v.string(),
    budgetAmount: v.number(),
    durationDays: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    actualSpent: v.number(),
    overrun: v.number(),
  }).index("by_user", ["clerkUserId"]),

  workflowRequests: defineTable({
    clerkUserId: v.string(),
    noteId: v.optional(v.id("notes")),
    prompt: v.string(),
    status: v.union(
      v.literal("drafting"),
      v.literal("ready"),
      v.literal("failed")
    ),
    n8nWorkflowId: v.optional(v.string()),
    n8nUrl: v.optional(v.string()),
    webhookPath: v.optional(v.string()),
    error: v.optional(v.string()),
    progressLog: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_note", ["noteId"]),

  workflowRuns: defineTable({
    requestId: v.id("workflowRequests"),
    runId: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("failed")
    ),
    summary: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  }).index("by_runId", ["runId"]),
});

