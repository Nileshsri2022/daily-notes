import { internalMutation, mutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { currentUserId, currentUserEmail } from "./helpers";

const MS_PER_DAY = 86_400_000;

/** Retrieves active budget status, historical cycle averages, and overrun metrics */
export const getBudgetStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      return { hasBudget: false as const };
    }

    const budget = await ctx.db
      .query("userBudgets")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!budget) {
      return { hasBudget: false as const };
    }

    const now = Date.now();
    const durationDays = budget.durationDays;
    const cycleStartDate = budget.cycleStartDate;
    const cycleEndDate = budget.cycleEndDate;

    const daysElapsed = Math.min(
      durationDays,
      Math.max(1, Math.floor((now - cycleStartDate) / MS_PER_DAY) + 1)
    );
    const daysLeft = Math.max(0, durationDays - daysElapsed);

    // Sum active expenses within current cycle window
    const rawExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .collect();

    // Check soft-delete status for parent notes
    const noteIds = [...new Set(rawExpenses.map((e) => e.noteId))];
    const notesMap = new Map();
    for (const noteId of noteIds) {
      const note = await ctx.db.get(noteId);
      if (note) notesMap.set(noteId, note);
    }

    const cycleExpenses = rawExpenses.filter((e) => {
      const note = notesMap.get(e.noteId);
      const isAlive = note && note.deletedAt === undefined;
      return isAlive && e.date >= cycleStartDate && e.date <= cycleEndDate;
    });

    const currentSpent = Math.round(
      cycleExpenses.reduce((sum, e) => sum + e.amount, 0) * 100
    ) / 100;

    const percentage = Math.round((currentSpent / budget.amount) * 100);
    const burnRate =
      Math.round((currentSpent / Math.max(1, daysElapsed)) * 100) / 100;
    const remainingBudget = Math.max(0, budget.amount - currentSpent);
    const safeDailySpend =
      daysLeft > 0
        ? Math.round((remainingBudget / daysLeft) * 100) / 100
        : 0;

    // Retrieve past completed cycles to calculate historical averages
    const pastCycles = await ctx.db
      .query("budgetCycles")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .collect();

    let historicalAverageSpent = 0;
    let historicalAverageOverrun = 0;
    let lastCycleOverrun: number | null = null;

    if (pastCycles.length > 0) {
      const totalCycles = pastCycles.length;
      const totalSpent = pastCycles.reduce((sum, c) => sum + c.actualSpent, 0);
      const totalOverrun = pastCycles.reduce((sum, c) => sum + c.overrun, 0);

      historicalAverageSpent = Math.round((totalSpent / totalCycles) * 100) / 100;
      historicalAverageOverrun =
        Math.round((totalOverrun / totalCycles) * 100) / 100;

      // Most recent completed cycle
      pastCycles.sort((a, b) => b.endDate - a.endDate);
      lastCycleOverrun = pastCycles[0].overrun;
    }

    return {
      hasBudget: true as const,
      budget: {
        amount: budget.amount,
        durationDays: budget.durationDays,
        cycleStartDate: budget.cycleStartDate,
        cycleEndDate: budget.cycleEndDate,
      },
      currentSpent,
      percentage,
      daysElapsed,
      daysLeft,
      burnRate,
      safeDailySpend,
      historicalAverageSpent,
      historicalAverageOverrun,
      lastCycleOverrun,
      completedCyclesCount: pastCycles.length,
    };
  },
});

/** Set or update budget amount and duration in days */
export const setBudget = mutation({
  args: {
    amount: v.number(),
    durationDays: v.number(),
  },
  handler: async (ctx, { amount, durationDays }) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    if (amount <= 0) throw new Error("Budget amount must be positive");
    if (durationDays < 1) throw new Error("Duration must be at least 1 day");

    const now = Date.now();
    const cycleStartDate = now;
    const cycleEndDate = now + durationDays * MS_PER_DAY;

    const existing = await ctx.db
      .query("userBudgets")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        amount: Math.round(amount * 100) / 100,
        durationDays,
        cycleStartDate,
        cycleEndDate,
        lastAlertThreshold: undefined,
      });
    } else {
      await ctx.db.insert("userBudgets", {
        clerkUserId: userId,
        amount: Math.round(amount * 100) / 100,
        durationDays,
        cycleStartDate,
        cycleEndDate,
      });
    }

    // Schedule cycle expiry in the cloud
    await ctx.scheduler.runAt(
      cycleEndDate,
      internal.budgets.processCycleExpiryAndRollover,
      {
        userId,
        scheduledEndDate: cycleEndDate,
      }
    );

    return { success: true };
  },
});

/** Background handler that wraps up an expiring cycle, archives history, sends report, and auto-rolls over */
export const processCycleExpiryAndRollover = internalMutation({
  args: {
    userId: v.string(),
    scheduledEndDate: v.number(),
  },
  handler: async (ctx, { userId, scheduledEndDate }) => {
    const budget = await ctx.db
      .query("userBudgets")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!budget) return;

    // If the cycle end date was modified by user since scheduling, do not run for stale date
    if (Math.abs(budget.cycleEndDate - scheduledEndDate) > 5000) {
      return;
    }

    // Calculate total spend in the completed cycle
    const rawExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .collect();

    const noteIds = [...new Set(rawExpenses.map((e) => e.noteId))];
    const notesMap = new Map();
    for (const noteId of noteIds) {
      const note = await ctx.db.get(noteId);
      if (note) notesMap.set(noteId, note);
    }

    const cycleExpenses = rawExpenses.filter((e) => {
      const note = notesMap.get(e.noteId);
      return (
        note &&
        note.deletedAt === undefined &&
        e.date >= budget.cycleStartDate &&
        e.date <= budget.cycleEndDate
      );
    });

    const actualSpent = Math.round(
      cycleExpenses.reduce((sum, e) => sum + e.amount, 0) * 100
    ) / 100;

    const overrun = Math.round((actualSpent - budget.amount) * 100) / 100;

    // 1. Archive finished cycle into budgetCycles
    await ctx.db.insert("budgetCycles", {
      clerkUserId: userId,
      budgetAmount: budget.amount,
      durationDays: budget.durationDays,
      startDate: budget.cycleStartDate,
      endDate: budget.cycleEndDate,
      actualSpent,
      overrun,
    });

    // 2. Dispatch Wrap-Up Email via Resend if email is available
    const userEmail = await currentUserEmail(ctx);
    if (userEmail) {
      await ctx.scheduler.runAfter(0, api.email.sendBudgetAlert, {
        to: userEmail,
        type: "cycle_wrapup",
        budgetAmount: budget.amount,
        spentAmount: actualSpent,
        daysLeft: 0,
        durationDays: budget.durationDays,
        overrun,
      });
    }

    // 3. Auto-rollover into new cycle with the same budget and duration
    const newStartDate = budget.cycleEndDate;
    const newEndDate = newStartDate + budget.durationDays * MS_PER_DAY;

    await ctx.db.patch(budget._id, {
      cycleStartDate: newStartDate,
      cycleEndDate: newEndDate,
      lastAlertThreshold: undefined,
    });

    // Schedule next cycle expiry
    await ctx.scheduler.runAt(
      newEndDate,
      internal.budgets.processCycleExpiryAndRollover,
      {
        userId,
        scheduledEndDate: newEndDate,
      }
    );
  },
});

/** Internal helper invoked after inserting expenses to detect threshold crossing and fire Resend alert */
export const checkAndTriggerThresholdAlert = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const budget = await ctx.db
      .query("userBudgets")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!budget) return;

    const now = Date.now();
    if (now < budget.cycleStartDate || now > budget.cycleEndDate) return;

    const rawExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .collect();

    const noteIds = [...new Set(rawExpenses.map((e) => e.noteId))];
    const notesMap = new Map();
    for (const noteId of noteIds) {
      const note = await ctx.db.get(noteId);
      if (note) notesMap.set(noteId, note);
    }

    const cycleExpenses = rawExpenses.filter((e) => {
      const note = notesMap.get(e.noteId);
      return (
        note &&
        note.deletedAt === undefined &&
        e.date >= budget.cycleStartDate &&
        e.date <= budget.cycleEndDate
      );
    });

    const currentSpent = cycleExpenses.reduce((sum, e) => sum + e.amount, 0);
    const percentage = (currentSpent / budget.amount) * 100;
    const lastThreshold = budget.lastAlertThreshold || 0;

    const daysElapsed = Math.min(
      budget.durationDays,
      Math.max(1, Math.floor((now - budget.cycleStartDate) / MS_PER_DAY) + 1)
    );
    const daysLeft = Math.max(0, budget.durationDays - daysElapsed);
    const remainingBudget = Math.max(0, budget.amount - currentSpent);
    const safeDailySpend =
      daysLeft > 0 ? remainingBudget / daysLeft : 0;

    const userEmail = await currentUserEmail(ctx);
    if (!userEmail) return;

    if (percentage >= 100 && lastThreshold < 100) {
      await ctx.db.patch(budget._id, { lastAlertThreshold: 100 });
      await ctx.scheduler.runAfter(0, api.email.sendBudgetAlert, {
        to: userEmail,
        type: "breach_100",
        budgetAmount: budget.amount,
        spentAmount: currentSpent,
        daysLeft,
        durationDays: budget.durationDays,
      });
    } else if (percentage >= 80 && lastThreshold < 80) {
      await ctx.db.patch(budget._id, { lastAlertThreshold: 80 });
      await ctx.scheduler.runAfter(0, api.email.sendBudgetAlert, {
        to: userEmail,
        type: "warning_80",
        budgetAmount: budget.amount,
        spentAmount: currentSpent,
        daysLeft,
        durationDays: budget.durationDays,
        safeDailySpend,
      });
    }
  },
});
