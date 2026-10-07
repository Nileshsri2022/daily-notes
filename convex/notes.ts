import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function currentUserId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const userId = await currentUserId(ctx);
    if (!userId) return null;
    const note = await ctx.db.get(id);
    if (!note || note.clerkUserId !== userId) return null;
    return note;
  },
});

const bodyFormat = v.optional(v.union(v.literal("markdown"), v.literal("html")));

export const create = mutation({
  args: { title: v.string(), body: v.string(), format: bodyFormat },
  handler: async (ctx, { title, body, format }) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    return await ctx.db.insert("notes", {
      clerkUserId: userId,
      title: title.trim() || "Untitled",
      body,
      format: format ?? "markdown",
      status: "draft",
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { id: v.id("notes"), title: v.string(), body: v.string(), format: bodyFormat },
  handler: async (ctx, { id, title, body, format }) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const note = await ctx.db.get(id);
    if (!note || note.clerkUserId !== userId) throw new Error("Note not found");
    await ctx.db.patch(id, {
      title: title.trim() || "Untitled",
      body,
      format: format ?? "markdown",
      updatedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("notes"),
    status: v.union(v.literal("draft"), v.literal("published")),
  },
  handler: async (ctx, { id, status }) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const note = await ctx.db.get(id);
    if (!note || note.clerkUserId !== userId) throw new Error("Note not found");
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const note = await ctx.db.get(id);
    if (!note || note.clerkUserId !== userId) throw new Error("Note not found");
    await ctx.db.delete(id);
  },
});
