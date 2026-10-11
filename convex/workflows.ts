import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { currentUserId } from "./helpers";
import type { Doc, Id } from "./_generated/dataModel";
import {
  buildProductionWebhookUrl,
  detectWorkflowIntent,
  extractJson,
  extractWebhookPath,
  validateWorkflowJson,
  type N8nWorkflow,
} from "../src/lib/n8n";
import {
  N8nError,
  activateWorkflowOnN8n,
  createWorkflowOnN8n,
  n8nHost,
  triggerWebhook,
} from "./n8n";

const requestStatus = v.union(
  v.literal("drafting"),
  v.literal("ready"),
  v.literal("failed"),
);
const runStatus = v.union(
  v.literal("running"),
  v.literal("success"),
  v.literal("failed"),
);

// ---------------------------------------------------------------------------
// Internal data access
// ---------------------------------------------------------------------------

export const insertRequest = internalMutation({
  args: {
    clerkUserId: v.string(),
    noteId: v.optional(v.id("notes")),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workflowRequests", {
      clerkUserId: args.clerkUserId,
      noteId: args.noteId,
      prompt: args.prompt,
      status: "drafting",
      createdAt: Date.now(),
    });
  },
});

export const updateRequest = internalMutation({
  args: {
    id: v.id("workflowRequests"),
    status: requestStatus,
    n8nWorkflowId: v.optional(v.string()),
    n8nUrl: v.optional(v.string()),
    webhookPath: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, status, n8nWorkflowId, n8nUrl, webhookPath, error } = args;
    const patch: {
      status: "drafting" | "ready" | "failed";
      n8nWorkflowId?: string;
      n8nUrl?: string;
      webhookPath?: string;
      error?: string;
    } = { status };
    if (n8nWorkflowId !== undefined) patch.n8nWorkflowId = n8nWorkflowId;
    if (n8nUrl !== undefined) patch.n8nUrl = n8nUrl;
    if (webhookPath !== undefined) patch.webhookPath = webhookPath;
    if (error !== undefined) patch.error = error;
    await ctx.db.patch(id, patch);
  },
});

export const insertRun = internalMutation({
  args: { requestId: v.id("workflowRequests"), runId: v.string() },
  handler: async (ctx, { requestId, runId }) => {
    return await ctx.db.insert("workflowRuns", {
      requestId,
      runId,
      status: "running",
      startedAt: Date.now(),
    });
  },
});

/** Record a run outcome (used by the n8n completion callback and runNow). */
export const recordRun = internalMutation({
  args: {
    runId: v.string(),
    status: runStatus,
    summary: v.optional(v.string()),
  },
  handler: async (ctx, { runId, status, summary }) => {
    const existing = await ctx.db
      .query("workflowRuns")
      .withIndex("by_runId", (q) => q.eq("runId", runId))
      .unique();
    if (!existing) throw new Error(`Unknown runId: ${runId}`);
    const patch: {
      status: "running" | "success" | "failed";
      summary?: string;
      finishedAt?: number;
    } = { status };
    if (summary !== undefined) patch.summary = summary;
    if (status !== "running") patch.finishedAt = Date.now();
    await ctx.db.patch(existing._id, patch);
  },
});

export const getRequest = internalQuery({
  args: { requestId: v.id("workflowRequests") },
  handler: async (ctx, { requestId }) => ctx.db.get(requestId),
});

export const getByNoteInternal = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const rows = await ctx.db
      .query("workflowRequests")
      .withIndex("by_note", (q) => q.eq("noteId", noteId))
      .order("desc")
      .take(1);
    return rows[0] ?? null;
  },
});

export const findRun = internalQuery({
  args: { runId: v.string() },
  handler: async (ctx, { runId }) => {
    return await ctx.db
      .query("workflowRuns")
      .withIndex("by_runId", (q) => q.eq("runId", runId))
      .unique();
  },
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Called (fire-and-forget) after a note is saved. Detects workflow intent in
 * the raw prompt; on YES creates a "drafting" request and schedules the
 * background generation. Never throws for non-intent text.
 */
export const requestFromNote = action({
  args: { noteId: v.id("notes"), prompt: v.string() },
  handler: async (
    ctx,
    { noteId, prompt }
  ): Promise<
    { detected: false } | { detected: true; requestId: Id<"workflowRequests"> }
  > => {
    if (!detectWorkflowIntent(prompt)) return { detected: false as const };
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? "dev_user";
    const existing: Doc<"workflowRequests"> | null = await ctx.runQuery(
      internal.workflows.getByNoteInternal,
      {
        noteId,
      },
    );
    if (existing && existing.clerkUserId === userId) {
      return { detected: true as const, requestId: existing._id };
    }
    const requestId: Id<"workflowRequests"> = await ctx.runMutation(
      internal.workflows.insertRequest,
      {
        clerkUserId: userId,
        noteId,
        prompt: prompt.slice(0, 2000),
      },
    );
    await ctx.scheduler.runAfter(0, internal.workflows.generateWorkflow, {
      requestId,
    });
    return { detected: true as const, requestId };
  },
});

/** Latest workflow request attached to a note (null when none). */
export const getByNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const userId = await currentUserId(ctx);
    if (!userId) return null;
    const rows = await ctx.db
      .query("workflowRequests")
      .withIndex("by_note", (q) => q.eq("noteId", noteId))
      .order("desc")
      .take(1);
    const req = rows[0];
    if (!req || req.clerkUserId !== userId) return null;
    return req;
  },
});

/** Run history for a workflow request, newest first. */
export const listRuns = query({
  args: { requestId: v.id("workflowRequests") },
  handler: async (ctx, { requestId }) => {
    const userId = await currentUserId(ctx);
    if (!userId) return [];
    const req = await ctx.db.get(requestId);
    if (!req || req.clerkUserId !== userId) return [];
    const runs = await ctx.db
      .query("workflowRuns")
      .filter((q) => q.eq(q.field("requestId"), requestId))
      .collect();
    return runs.sort((a, b) => b.startedAt - a.startedAt);
  },
});

/**
 * Activate the workflow if needed, then trigger a run via its webhook.
 * Creates the run row first so the n8n completion callback can update it.
 */
export const runNow = action({
  args: { requestId: v.id("workflowRequests") },
  handler: async (ctx, { requestId }) => {
    const request: Doc<"workflowRequests"> | null = await ctx.runQuery(
      internal.workflows.getRequest,
      {
        requestId,
      },
    );
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? "dev_user";
    if (!request || request.clerkUserId !== userId) {
      throw new Error("Workflow not found");
    }
    if (
      request.status !== "ready" ||
      !request.n8nWorkflowId ||
      !request.webhookPath
    ) {
      throw new Error(
        "Workflow is not ready yet. Open it in n8n, fill any credentials, then try again.",
      );
    }
    try {
      await activateWorkflowOnN8n(request.n8nWorkflowId);
    } catch (e) {
      console.warn(
        "n8n activate failed (continuing):",
        e instanceof Error ? e.message : String(e),
      );
    }
    const runId = crypto.randomUUID();
    await ctx.runMutation(internal.workflows.insertRun, { requestId, runId });
    const url = buildProductionWebhookUrl(n8nHost(), request.webhookPath);
    try {
      await triggerWebhook(url, { runId });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.workflows.recordRun, {
        runId,
        status: "failed",
        summary: message.slice(0, 500),
      });
      throw new Error(message);
    }
    return { runId };
  },
});

// ---------------------------------------------------------------------------
// Background generation (LLM → validate → n8n)
// ---------------------------------------------------------------------------

function resolveLlmConfig(): { url: string; apiKey: string; model: string } {
  const baseUrl =
    process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "AI API key is missing. Please set AI_API_KEY in Convex environment variables.",
    );
  }
  return {
    url: `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
    apiKey,
    model: "openai/gpt-oss-20b",
  };
}

function getCallbackUrl(): string {
  const site = (process.env.CONVEX_SITE_URL || "").replace(/\/+$/, "");
  if (!site) {
    throw new Error(
      "CONVEX_SITE_URL is not set. Set it to your Convex deployment site URL (e.g. https://glorious-panda-123.convex.site) in environment variables. See N8N_SETUP.md.",
    );
  }
  return `${site}/n8n-callback`;
}

function buildWorkflowPrompt(
  prompt: string,
  callbackUrl: string,
): { system: string; user: string } {
  const system = `You generate n8n workflow JSON from a user's natural-language automation request.
This runs on a free open model, so follow the structure below exactly — do not improvise new shapes.

RULES:
- Output ONLY valid JSON: { "name": string, "nodes": [...], "connections": {...}, "settings": {...} }.
- Allowed node types (use ONLY these): n8n-nodes-base.webhook, n8n-nodes-base.httpRequest, n8n-nodes-base.scheduleTrigger, n8n-nodes-base.code, n8n-nodes-base.if, n8n-nodes-base.set, @n8n/n8n-nodes-langchain.agent.
- The FIRST node MUST be named exactly "Trigger", type n8n-nodes-base.webhook, with parameters { "httpMethod": "POST", "path": "dincharya-webhook", "responseMode": "onReceived" }. It receives { "runId": string } in the body.
- The LAST step MUST be an HTTP Request node POSTing to ${callbackUrl} with a header "X-Callback-Secret" = "YOUR_N8N_CALLBACK_SECRET" and a JSON body containing "runId": "={{ $('Trigger').item.json.runId }}", "status": "success" and a short "summary". Add an error branch that posts status "failed" with the error text.
- Reference the runId ONLY as {{ $('Trigger').item.json.runId }} (never $json.runId — intermediate nodes do not forward it).
- Credentials: reference by descriptive placeholder name only, with empty id. NEVER invent credential IDs or include secrets.
- If the request needs something with no matching node (e.g. native browser automation), use an HTTP Request node to "https://example.com/todo-wire-up" and add a "notes" field on the node explaining what the user must wire up.
- Keep it to 8 nodes or fewer. Prefer simple over clever.

EXAMPLE (minimal valid workflow):
{
  "name": "Dincharya: Example reminder",
  "nodes": [
    { "id": "a1", "name": "Trigger", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [0, 0], "parameters": { "httpMethod": "POST", "path": "dincharya-webhook", "responseMode": "onReceived" } },
    { "id": "a2", "name": "DoWork", "type": "n8n-nodes-base.set", "typeVersion": 3, "position": [200, 0], "parameters": { "assignments": { "assignments": [{ "id": "x", "name": "summary", "value": "done", "type": "string" }] } } },
    { "id": "a3", "name": "ReportBack", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [400, 0], "parameters": { "method": "POST", "url": "${callbackUrl}", "sendHeaders": true, "headerParameters": { "parameters": [{ "name": "X-Callback-Secret", "value": "YOUR_N8N_CALLBACK_SECRET" }] }, "sendBody": true, "specifyBody": "json", "jsonBody": "={\\"runId\\": \\"={{ $('Trigger').item.json.runId }}\\", \\"status\\": \\"success\\", \\"summary\\": \\"={{ $json.summary }}\\"}" } }
  ],
  "connections": {
    "Trigger": { "main": [[{ "node": "DoWork", "type": "main", "index": 0 }]] },
    "DoWork": { "main": [[{ "node": "ReportBack", "type": "main", "index": 0 }]] }
  },
  "settings": { "executionOrder": "v1" }
}`;
  const user = `Create an n8n workflow for this request:\n\n${prompt}`;
  return { system, user };
}

async function generateWithRetry(
  prompt: string,
  callbackUrl: string,
): Promise<N8nWorkflow> {
  const { url, apiKey, model } = resolveLlmConfig();
  const { system, user } = buildWorkflowPrompt(prompt, callbackUrl);
  let lastErrors: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              attempt === 0
                ? user
                : `${user}\n\nYour previous output had these problems — fix them:\n- ${lastErrors.join("\n- ")}`,
          },
        ],
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Provider error (${res.status}): ${errText.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content);
    if (parsed === undefined) {
      lastErrors = ["Output was not valid JSON"];
      continue;
    }
    const result = validateWorkflowJson(parsed, callbackUrl);
    if (result.ok && result.workflow) return result.workflow;
    lastErrors = result.errors;
  }
  throw new Error(
    `Could not generate a valid workflow: ${lastErrors.slice(0, 3).join("; ")}`,
  );
}

export const generateWorkflow = internalAction({
  args: { requestId: v.id("workflowRequests") },
  handler: async (ctx, { requestId }) => {
    const request: Doc<"workflowRequests"> | null = await ctx.runQuery(
      internal.workflows.getRequest,
      {
        requestId,
      },
    );
    if (!request) return;
    const fail = async (error: string) => {
      await ctx.runMutation(internal.workflows.updateRequest, {
        id: requestId,
        status: "failed",
        error: error.slice(0, 500),
      });
    };
    try {
      // Fail fast with clear errors when n8n / callback URL are not configured.
      const callbackUrl = getCallbackUrl();
      const host = n8nHost();
      const workflow = await generateWithRetry(request.prompt, callbackUrl);
      const { id } = await createWorkflowOnN8n(
        workflow as unknown as Record<string, unknown>,
      );
      try {
        await activateWorkflowOnN8n(id);
      } catch (e) {
        console.warn(
          "n8n auto-activate failed (runNow will retry):",
          e instanceof Error ? e.message : String(e),
        );
      }
      const webhookPath = extractWebhookPath(workflow);
      await ctx.runMutation(internal.workflows.updateRequest, {
        id: requestId,
        status: "ready",
        n8nWorkflowId: id,
        n8nUrl: `${host}/workflow/${id}`,
        webhookPath: webhookPath ?? undefined,
      });
    } catch (e) {
      const message =
        e instanceof N8nError || e instanceof Error ? e.message : String(e);
      await fail(message);
    }
  },
});
