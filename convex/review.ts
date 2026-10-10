import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { currentUserId } from "./helpers";
import {
  buildDigestPrompt,
  extractTaskStats,
  sanitizeDigestResponse,
  weekDayKeys,
  weekLabel,
  weekRange,
  type CategoryTotal,
  type DigestAi,
  type WeekNoteInput,
  type WeekStatsInput,
} from "../src/lib/review";
import { currentStreak } from "../src/lib/habits";
import { dayKey } from "../src/lib/calendar";

const categoryTotal = v.object({ category: v.string(), amount: v.number() });

const statsValidator = v.object({
  notesWritten: v.number(),
  tasksDone: v.number(),
  tasksPending: v.number(),
  pendingTasks: v.array(v.string()),
  totalSpent: v.number(),
  currency: v.string(),
  topCategories: v.array(categoryTotal),
  habitsChecked: v.number(),
  activeStreaks: v.number(),
});

const aiValidator = v.object({
  summary: v.string(),
  moodByDay: v.array(
    v.object({ date: v.string(), score: v.number(), label: v.string() }),
  ),
  keyMoments: v.array(v.string()),
});

/** Stored stats shape: prompt-only pendingTaskTexts replaced by pendingTasks. */
interface StoredStats {
  notesWritten: number;
  tasksDone: number;
  tasksPending: number;
  pendingTasks: string[];
  totalSpent: number;
  currency: string;
  topCategories: CategoryTotal[];
  habitsChecked: number;
  activeStreaks: number;
}

/** Assemble one Mon–Sun week of diary data for the digest prompt. */
export const getWeekData = internalQuery({
  args: { userId: v.string(), weekKey: v.string() },
  handler: async (ctx, { userId, weekKey }) => {
    const { start, end } = weekRange(weekKey); // throws on bad key
    const startMs = start.getTime();
    const endMs = end.getTime();

    const notes = (
      await ctx.db
        .query("notes")
        .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
        .collect()
    )
      .filter(
        (n) =>
          n.deletedAt === undefined &&
          n.updatedAt >= startMs &&
          n.updatedAt <= endMs,
      )
      .sort((a, b) => a.updatedAt - b.updatedAt);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_user_date", (q) =>
        q.eq("clerkUserId", userId).gte("date", startMs).lte("date", endMs),
      )
      .collect();

    const habitChecks = await ctx.db
      .query("habitChecks")
      .withIndex("by_user_date", (q) =>
        q
          .eq("clerkUserId", userId)
          .gte("date", dayKey(start))
          .lte("date", dayKey(end)),
      )
      .collect();

    // Active streaks need full per-habit history, not just this week.
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .collect();
    let activeStreaks = 0;
    for (const habit of habits) {
      const checks = await ctx.db
        .query("habitChecks")
        .withIndex("by_habit", (q) => q.eq("habitId", habit._id))
        .order("desc")
        .take(500);
      if (currentStreak(checks.map((c) => c.date)) >= 2) activeStreaks += 1;
    }

    const bodies = notes.map((n) => n.body);
    const taskStats = extractTaskStats(bodies);

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const byCat = new Map<string, number>();
    for (const e of expenses) {
      byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    }
    const topCategories: CategoryTotal[] = [...byCat.entries()]
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const weekNotes: WeekNoteInput[] = notes.map((n) => ({
      title: n.title,
      body: n.body,
      updatedAt: n.updatedAt,
    }));

    const stats: WeekStatsInput = {
      notesWritten: notes.length,
      tasksDone: taskStats.done,
      tasksPending: taskStats.pending,
      pendingTaskTexts: taskStats.pendingTexts.slice(0, 12),
      totalSpent: Math.round(totalSpent * 100) / 100,
      currency: expenses[0]?.currency ?? "₹",
      topCategories,
      habitsChecked: habitChecks.length,
      activeStreaks,
    };

    return { notes: weekNotes, stats };
  },
});

export const saveDigest = internalMutation({
  args: {
    userId: v.string(),
    weekKey: v.string(),
    model: v.string(),
    stats: statsValidator,
    ai: aiValidator,
  },
  handler: async (ctx, { userId, weekKey, model, stats, ai }) => {
    const doc = {
      clerkUserId: userId,
      weekKey,
      generatedAt: Date.now(),
      model,
      stats: { ...stats, pendingTasks: stats.pendingTasks.slice(0, 12) },
      ai,
    };
    const existing = await ctx.db
      .query("weeklyDigests")
      .withIndex("by_user_week", (q) =>
        q.eq("clerkUserId", userId).eq("weekKey", weekKey),
      )
      .first();
    if (existing) {
      await ctx.db.replace(existing._id, doc);
      return existing._id;
    }
    return await ctx.db.insert("weeklyDigests", doc);
  },
});

/** Cached digest for a week, or null if not generated yet. */
export const getDigest = query({
  args: { weekKey: v.string() },
  handler: async (ctx, { weekKey }) => {
    const userId = await currentUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("weeklyDigests")
      .withIndex("by_user_week", (q) =>
        q.eq("clerkUserId", userId).eq("weekKey", weekKey),
      )
      .first();
  },
});

/**
 * Generate (or regenerate) the digest for a week: assemble data, call the
 * LLM, sanitize, cache, return. Skips the LLM call entirely for empty weeks.
 */
export const generateDigest = action({
  args: {
    weekKey: v.string(),
    apiKey: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { weekKey, apiKey, baseUrl, model }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? "dev_user";

    const label = weekLabel(weekKey); // throws on malformed key
    const data: { notes: WeekNoteInput[]; stats: WeekStatsInput } =
      await ctx.runQuery(internal.review.getWeekData, {
        userId,
        weekKey,
      });

    const isEmpty =
      data.notes.length === 0 &&
      data.stats.totalSpent === 0 &&
      data.stats.habitsChecked === 0;
    if (isEmpty) return { empty: true as const };

    const finalBaseUrl =
      baseUrl ||
      process.env.AI_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1";
    const finalApiKey =
      apiKey || process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
    const finalModel = model || "openai/gpt-oss-20b";
    if (!finalApiKey) {
      throw new Error(
        "AI API key is missing. Please set AI_API_KEY in Convex or .env",
      );
    }

    const { system, user } = buildDigestPrompt(data.notes, data.stats, label);
    const res = await fetch(`${finalBaseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${finalApiKey}`,
      },
      body: JSON.stringify({
        model: finalModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.5,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Provider error (${res.status}): ${errText}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    const ai: DigestAi = sanitizeDigestResponse(content, weekDayKeys(weekKey));

    // Drop the prompt-only pendingTaskTexts; the stored shape carries pendingTasks.
    const statsForSave: StoredStats = {
      notesWritten: data.stats.notesWritten,
      tasksDone: data.stats.tasksDone,
      tasksPending: data.stats.tasksPending,
      pendingTasks: data.stats.pendingTaskTexts.slice(0, 12),
      totalSpent: data.stats.totalSpent,
      currency: data.stats.currency,
      topCategories: data.stats.topCategories,
      habitsChecked: data.stats.habitsChecked,
      activeStreaks: data.stats.activeStreaks,
    };
    await ctx.runMutation(internal.review.saveDigest, {
      userId,
      weekKey,
      model: finalModel,
      stats: statsForSave,
      ai,
    });

    return {
      empty: false as const,
      digest: {
        weekKey,
        generatedAt: Date.now(),
        model: finalModel,
        stats: statsForSave,
        ai,
      },
    };
  },
});
