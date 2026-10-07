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
});
