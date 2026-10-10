import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserId } from "./helpers";

const MAX_NAME_LENGTH = 40;
const MAX_CHECKS_RETURNED = 500;

function cleanName(name: string): string {
  return name.trim().slice(0, MAX_NAME_LENGTH);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (!userId) return [];
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .collect();
    // Streak math runs client-side (src/lib/habits.ts); the server just
    // ships recent check day-keys so the math stays unit-testable.
    return await Promise.all(
      habits
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(async (habit) => {
          const checks = await ctx.db
            .query("habitChecks")
            .withIndex("by_habit", (q) => q.eq("habitId", habit._id))
            .order("desc")
            .take(MAX_CHECKS_RETURNED);
          return {
            _id: habit._id,
            name: habit.name,
            icon: habit.icon ?? "🎯",
            color: habit.color ?? "#3E6B4F",
            createdAt: habit.createdAt,
            checkKeys: checks.map((c) => c.date),
          };
        }),
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { name, icon, color }) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const clean = cleanName(name);
    if (!clean) throw new Error("Habit name is required");
    return await ctx.db.insert("habits", {
      clerkUserId: userId,
      name: clean,
      icon: icon?.trim().slice(0, 8) || undefined,
      color: color?.trim().slice(0, 16) || undefined,
      createdAt: Date.now(),
    });
  },
});

export const toggleCheck = mutation({
  args: { habitId: v.id("habits"), date: v.string() },
  handler: async (ctx, { habitId, date }) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
    const habit = await ctx.db.get(habitId);
    if (!habit || habit.clerkUserId !== userId) throw new Error("Habit not found");
    const existing = await ctx.db
      .query("habitChecks")
      .withIndex("by_habit", (q) => q.eq("habitId", habitId))
      .filter((q) => q.eq(q.field("date"), date))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { checked: false };
    }
    await ctx.db.insert("habitChecks", {
      habitId,
      clerkUserId: userId,
      date,
      createdAt: Date.now(),
    });
    return { checked: true };
  },
});

export const removeHabit = mutation({
  args: { habitId: v.id("habits") },
  handler: async (ctx, { habitId }) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const habit = await ctx.db.get(habitId);
    if (!habit || habit.clerkUserId !== userId) throw new Error("Habit not found");
    const checks = await ctx.db
      .query("habitChecks")
      .withIndex("by_habit", (q) => q.eq("habitId", habitId))
      .collect();
    await Promise.all(checks.map((c) => ctx.db.delete(c._id)));
    await ctx.db.delete(habitId);
    return { deleted: true };
  },
});
