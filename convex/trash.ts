import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

async function currentUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

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
    const trashed: Doc<"notes">[] = [];
    for (const note of all) {
      if (note.deletedAt !== undefined) trashed.push(note);
    }
    return trashed;
  },
});

export const softDelete = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");
    const note = await ctx.db.get(id);
    if (!note || note.clerkUserId !== identity.subject) {
      throw new Error("Note not found");
    }
    await ctx.db.patch(id, { deletedAt: Date.now() });
  },
});

export const restore = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");
    const note = await ctx.db.get(id);
    if (!note || note.clerkUserId !== identity.subject) {
      throw new Error("Note not found");
    }
    await ctx.db.patch(id, { deletedAt: undefined });
  },
});
