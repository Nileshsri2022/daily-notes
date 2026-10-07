import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export async function currentUserId(
  ctx: QueryCtx | MutationCtx
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/** Throws unless the signed-in user owns the note; returns it. */
export async function requireNote(
  ctx: MutationCtx,
  id: Id<"notes">
): Promise<Doc<"notes">> {
  const userId = await currentUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  const note = await ctx.db.get(id);
  if (!note || note.clerkUserId !== userId) throw new Error("Note not found");
  return note;
}
