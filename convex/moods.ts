import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserId } from "./helpers";

const dateArg = v.string(); // local "YYYY-MM-DD"

function assertDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
}

/** One day's log, or null. */
export const getDay = query({
  args: { date: dateArg },
  handler: async (ctx, { date }) => {
    const userId = await currentUserId(ctx);
    if (!userId) return null;
    assertDate(date);
    return await ctx.db
      .query("moodLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("clerkUserId", userId).eq("date", date),
      )
      .first();
  },
});

/** Logs in a [startDate, endDate] ms range (inclusive), oldest first. */
export const getRange = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await currentUserId(ctx);
    if (!userId) return [];
    const startKey = new Date(startDate);
    const endKey = new Date(endDate);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
    const from = fmt(startKey) < fmt(endKey) ? fmt(startKey) : fmt(endKey);
    const to = fmt(startKey) < fmt(endKey) ? fmt(endKey) : fmt(startKey);
    return await ctx.db
      .query("moodLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("clerkUserId", userId).gte("date", from).lte("date", to),
      )
      .collect();
  },
});

/** Log (or re-log) a day's mood. One row per day — re-tap updates it. */
export const log = mutation({
  args: { date: dateArg, score: v.number() },
  handler: async (ctx, { date, score }) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    assertDate(date);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new Error("Score must be 1–5");
    }
    const existing = await ctx.db
      .query("moodLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("clerkUserId", userId).eq("date", date),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { score });
      return existing._id;
    }
    return await ctx.db.insert("moodLogs", { clerkUserId: userId, date, score });
  },
});

/** Clear a day's log. */
export const remove = mutation({
  args: { date: dateArg },
  handler: async (ctx, { date }) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    assertDate(date);
    const existing = await ctx.db
      .query("moodLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("clerkUserId", userId).eq("date", date),
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return { deleted: !!existing };
  },
});
