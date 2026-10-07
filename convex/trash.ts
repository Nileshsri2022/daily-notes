import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserId, requireNote } from "./helpers";

/** The signed-in user's trashed notes, newest-updated first. */
export const listTrash = query({
  args: {},
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (!userId) return [];
    const all = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
      .order("desc")
      .collect();
    return all.filter((note) => note.deletedAt !== undefined);
  },
});

export const softDelete = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    await requireNote(ctx, id);
    await ctx.db.patch(id, { deletedAt: Date.now() });
  },
});

export const restore = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    await requireNote(ctx, id);
    await ctx.db.patch(id, { deletedAt: undefined });
  },
});
