import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserId, requireNote } from "./helpers";

export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Bills & Subscriptions",
  "Health & Wellness",
  "Entertainment",
  "Work & Education",
  "General / Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const expenseCategoryValidator = v.union(
  v.literal("Food & Dining"),
  v.literal("Transportation"),
  v.literal("Shopping"),
  v.literal("Bills & Subscriptions"),
  v.literal("Health & Wellness"),
  v.literal("Entertainment"),
  v.literal("Work & Education"),
  v.literal("General / Other")
);

export const expenseItemValidator = v.object({
  item: v.string(),
  amount: v.number(),
  category: expenseCategoryValidator,
  currency: v.optional(v.string()),
});

/** List all active expenses for the signed-in user, filtered by date range */
export const list = query({
  args: {
    startDate: v.optional(v.number()), // Unix ms timestamp
    endDate: v.optional(v.number()),   // Unix ms timestamp
  },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await currentUserId(ctx);
    if (!userId) return [];

    const rawExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .order("desc")
      .collect();

    // Collect note IDs to check for soft-deleted notes
    const noteIds = [...new Set(rawExpenses.map((e) => e.noteId))];
    const notesMap = new Map();
    for (const noteId of noteIds) {
      const note = await ctx.db.get(noteId);
      if (note) notesMap.set(noteId, note);
    }

    // Filter out expenses whose source note is deleted or missing
    const activeExpenses = rawExpenses.filter((e) => {
      const note = notesMap.get(e.noteId);
      return note && note.deletedAt === undefined;
    });

    const normalizeCurrency = (c?: string) => (!c || c === "$" ? "₹" : c);

    if (startDate !== undefined && endDate !== undefined) {
      return activeExpenses
        .filter((e) => e.date >= startDate && e.date <= endDate)
        .map((e) => ({
          ...e,
          currency: normalizeCurrency(e.currency),
          noteTitle: notesMap.get(e.noteId)?.title || "Spoken Reflections",
        }));
    }

    return activeExpenses.map((e) => {
      const note = notesMap.get(e.noteId);
      return {
        ...e,
        currency: normalizeCurrency(e.currency),
        noteTitle: note?.title || "Spoken Reflections",
      };
    });
  },
});

/** Aggregate summary: total spent in range, total all time, and category breakdowns */
export const getSummary = query({
  args: {
    startDate: v.optional(v.number()), // Unix ms timestamp
    endDate: v.optional(v.number()),   // Unix ms timestamp
  },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      return {
        totalThisMonth: 0,
        totalAllTime: 0,
        currency: "₹",
        categoryBreakdown: [],
        transactionCount: 0,
      };
    }

    const rawExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .collect();

    // Check soft delete status for each note
    const noteIds = [...new Set(rawExpenses.map((e) => e.noteId))];
    const notesMap = new Map();
    for (const noteId of noteIds) {
      const note = await ctx.db.get(noteId);
      if (note) notesMap.set(noteId, note);
    }

    const activeExpenses = rawExpenses.filter((e) => {
      const note = notesMap.get(e.noteId);
      return note && note.deletedAt === undefined;
    });

    const isInRange = (expDate: number) => {
      if (startDate !== undefined && endDate !== undefined) {
        return expDate >= startDate && expDate <= endDate;
      }
      return true;
    };

    let totalInRange = 0;
    let totalAllTime = 0;
    const categoryTotals: Record<string, { total: number; count: number }> = {};

    for (const cat of EXPENSE_CATEGORIES) {
      categoryTotals[cat] = { total: 0, count: 0 };
    }

    let defaultCurrency = "₹";

    for (const exp of activeExpenses) {
      totalAllTime += exp.amount;
      if (exp.currency && exp.currency !== "$") defaultCurrency = exp.currency;

      if (isInRange(exp.date)) {
        totalInRange += exp.amount;
        if (!categoryTotals[exp.category]) {
          categoryTotals[exp.category] = { total: 0, count: 0 };
        }
        categoryTotals[exp.category].total += exp.amount;
        categoryTotals[exp.category].count += 1;
      }
    }

    // Format category breakdown with percentages
    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
        percentage:
          totalInRange > 0
            ? Math.round((data.total / totalInRange) * 100)
            : 0,
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);

    return {
      totalThisMonth: Math.round(totalInRange * 100) / 100,
      totalAllTime: Math.round(totalAllTime * 100) / 100,
      currency: defaultCurrency,
      categoryBreakdown,
      transactionCount: activeExpenses.filter((e) => isInRange(e.date)).length,
    };
  },
});

/** Atomically log extracted expenses when an AI voice note is saved */
export const logFromNote = mutation({
  args: {
    noteId: v.id("notes"),
    expenses: v.array(expenseItemValidator),
  },
  handler: async (ctx, { noteId, expenses }) => {
    const note = await requireNote(ctx, noteId);
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    // Remove any previous expenses for this note to avoid duplicates if re-saved
    const existing = await ctx.db
      .query("expenses")
      .withIndex("by_note", (q) => q.eq("noteId", noteId))
      .collect();

    for (const exp of existing) {
      await ctx.db.delete(exp._id);
    }

    const insertedIds = [];
    for (const exp of expenses) {
      if (exp.amount <= 0) continue;
      const currency = exp.currency && exp.currency !== "$" ? exp.currency : "₹";
      const id = await ctx.db.insert("expenses", {
        clerkUserId: userId,
        noteId,
        amount: Math.round(exp.amount * 100) / 100,
        currency,
        item: exp.item.trim(),
        category: exp.category,
        date: note.updatedAt || Date.now(),
      });
      insertedIds.push(id);
    }

    return insertedIds;
  },
});

/** Remove all expenses linked to a note (e.g. upon permanent note purge) */
export const removeByNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const linked = await ctx.db
      .query("expenses")
      .withIndex("by_note", (q) => q.eq("noteId", noteId))
      .collect();

    for (const exp of linked) {
      await ctx.db.delete(exp._id);
    }
  },
});

/** Normalize all stored expenses from $ to ₹ */
export const updateCurrencyToInr = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (!userId) return 0;
    const all = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .collect();
    let count = 0;
    for (const exp of all) {
      if (!exp.currency || exp.currency === "$") {
        await ctx.db.patch(exp._id, { currency: "₹" });
        count++;
      }
    }
    return count;
  },
});
