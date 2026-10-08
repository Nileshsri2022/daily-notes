import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserId, requireNote } from "./helpers";

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
const tagsArg = v.optional(v.array(v.string()));

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
}

export const create = mutation({
  args: { title: v.string(), body: v.string(), format: bodyFormat, tags: tagsArg },
  handler: async (ctx, { title, body, format, tags }) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    return await ctx.db.insert("notes", {
      clerkUserId: userId,
      title: title.trim() || "Untitled",
      body,
      format: format ?? "markdown",
      tags: normalizeTags(tags),
      status: "draft",
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { id: v.id("notes"), title: v.string(), body: v.string(), format: bodyFormat, tags: tagsArg },
  handler: async (ctx, { id, title, body, format, tags }) => {
    await requireNote(ctx, id);
    await ctx.db.patch(id, {
      title: title.trim() || "Untitled",
      body,
      format: format ?? "markdown",
      tags: normalizeTags(tags),
      updatedAt: Date.now(),
    });
  },
});

export const coverUrl = query({
  args: { id: v.id("_storage") },
  handler: async (ctx, { id }) => await ctx.storage.getUrl(id),
});

export const generateCoverUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await currentUserId(ctx))) throw new Error("Not signed in");
    return await ctx.storage.generateUploadUrl();
  },
});

export const setCover = mutation({
  args: { id: v.id("notes"), coverStorageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { id, coverStorageId }) => {
    const note = await requireNote(ctx, id);
    if (note.coverStorageId && note.coverStorageId !== coverStorageId) {
      await ctx.storage.delete(note.coverStorageId);
    }
    await ctx.db.patch(id, { coverStorageId: coverStorageId ?? undefined });
  },
});

export const setPinned = mutation({
  args: { id: v.id("notes"), pinned: v.boolean() },
  handler: async (ctx, { id, pinned }) => {
    await requireNote(ctx, id);
    await ctx.db.patch(id, { pinned });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("notes"),
    status: v.union(v.literal("draft"), v.literal("published")),
  },
  handler: async (ctx, { id, status }) => {
    await requireNote(ctx, id);
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const note = await requireNote(ctx, id);
    if (note.coverStorageId) await ctx.storage.delete(note.coverStorageId);
    await ctx.db.delete(id);
  },
});

export const toggleTask = mutation({
  args: {
    id: v.id("notes"),
    lineIndex: v.number(),
    completed: v.boolean(),
  },
  handler: async (ctx, { id, lineIndex, completed }) => {
    const note = await requireNote(ctx, id);
    const lines = note.body.split("\n");
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    const regex = /^(\s*(?:<p>)?\s*)-\s*\[([ xX])\]\s*(.*?)(?:<\/p>)?$/;
    const targetLine = lines[lineIndex];
    const match = targetLine.match(regex);
    if (!match) return;

    const prefix = match[1];
    const text = match[3];
    const hasClosingP = targetLine.endsWith("</p>");
    lines[lineIndex] = `${prefix}- [${completed ? "x" : " "}] ${text}${
      hasClosingP ? "</p>" : ""
    }`;

    await ctx.db.patch(id, {
      body: lines.join("\n"),
      updatedAt: Date.now(),
    });
  },
});

