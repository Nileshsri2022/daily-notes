import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notes: defineTable({
    clerkUserId: v.string(),
    title: v.string(),
    body: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    updatedAt: v.number(),
  }).index("by_user", ["clerkUserId", "updatedAt"]),
});
