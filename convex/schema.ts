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
});

