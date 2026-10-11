import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
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
  diagnoseExecution,
  n8nHost,
  triggerWebhook,
  updateWorkflowOnN8n,
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
    // Hide test-on-generate runs from the user-visible history.
    return runs
      .filter((r) => !r.runId.startsWith(TEST_RUN_PREFIX))
      .sort((a, b) => b.startedAt - a.startedAt);
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

/**
 * Re-run generation for a failed request. requestFromNote dedupes by note,
 * so without this a failed card is a dead end — this lets the user tap
 * "Try again" on the same note instead of writing a new one.
 */
export const retryRequest = action({
  args: { requestId: v.id("workflowRequests") },
  handler: async (ctx, { requestId }) => {
    const request: Doc<"workflowRequests"> | null = await ctx.runQuery(
      internal.workflows.getRequest,
      { requestId },
    );
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? "dev_user";
    if (!request || request.clerkUserId !== userId) {
      throw new Error("Workflow not found");
    }
    if (request.status !== "failed") {
      throw new Error("Only failed requests can be retried");
    }
    await ctx.runMutation(internal.workflows.updateRequest, {
      id: requestId,
      status: "drafting",
      error: "",
    });
    await ctx.scheduler.runAfter(0, internal.workflows.generateWorkflow, {
      requestId,
    });
    return { requestId };
  },
});

// ---------------------------------------------------------------------------
// Background generation (LLM → validate → n8n)
// ---------------------------------------------------------------------------

function resolveLlmConfig(): { url: string; apiKey: string; model: string } {
  // Per-feature overrides let workflow generation use a different provider
  // than notes/review (e.g. Gemini for workflows, Groq for notes). Each
  // falls back to the shared AI_* vars when unset.
  const baseUrl =
    process.env.WORKFLOW_AI_BASE_URL ||
    process.env.AI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1";
  const apiKey =
    process.env.WORKFLOW_AI_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";
  if (!apiKey) {
    throw new Error(
      "AI API key is missing. Please set WORKFLOW_AI_API_KEY (or AI_API_KEY) in Convex environment variables.",
    );
  }
  return {
    url: `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
    apiKey,
    model: process.env.WORKFLOW_AI_MODEL || "openai/gpt-oss-20b",
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
- The LAST step MUST be an HTTP Request node POSTing to ${callbackUrl} with a header "X-Callback-Secret" = "YOUR_N8N_CALLBACK_SECRET" and a JSON body containing "runId": "={{ $('Trigger').item.json.body.runId }}", "status": "success" and a short "summary". Add an error branch that posts status "failed" with the error text.
- Reference the runId ONLY as {{ $('Trigger').item.json.body.runId }} (never $json.runId — intermediate nodes do not forward it). Webhook input is nested under "body".
- Credentials: reference by descriptive placeholder name only, with empty id. NEVER invent credential IDs or include secrets.
- If the request needs something with no matching node (e.g. native browser automation), use an HTTP Request node to "https://example.com/todo-wire-up" and add a "notes" field on the node explaining what the user must wire up.
- Keep it to 8 nodes or fewer. Prefer simple over clever.

EXAMPLE (minimal valid workflow):
{
  "name": "Dincharya: Example reminder",
  "nodes": [
    { "id": "a1", "name": "Trigger", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [0, 0], "parameters": { "httpMethod": "POST", "path": "dincharya-webhook", "responseMode": "onReceived" } },
    { "id": "a2", "name": "DoWork", "type": "n8n-nodes-base.set", "typeVersion": 3, "position": [200, 0], "parameters": { "assignments": { "assignments": [{ "id": "x", "name": "summary", "value": "done", "type": "string" }] } } },
    { "id": "a3", "name": "ReportBack", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [400, 0], "parameters": { "method": "POST", "url": "${callbackUrl}", "sendHeaders": true, "headerParameters": { "parameters": [{ "name": "X-Callback-Secret", "value": "YOUR_N8N_CALLBACK_SECRET" }] }, "sendBody": true, "specifyBody": "json", "jsonBody": "={\\"runId\\": \\"={{ $('Trigger').item.json.body.runId }}\\", \\"status\\": \\"success\\", \\"summary\\": \\"={{ $json.summary }}\\"}" } }
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
  initialErrors: string[] = [],
): Promise<N8nWorkflow> {
  const { url, apiKey, model } = resolveLlmConfig();
  const { system, user } = buildWorkflowPrompt(prompt, callbackUrl);
  let lastErrors: string[] = [...initialErrors];
  let lastRaw = "";
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
              lastErrors.length === 0
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
      error?: { message?: string };
    };
    if (data.error) {
      // Some providers answer HTTP 200 with an error payload instead of
      // choices. Surface it directly rather than misreporting bad JSON.
      throw new Error(
        `AI Provider error: ${(data.error.message ?? "unknown").slice(0, 300)}`,
      );
    }
    const content = data.choices?.[0]?.message?.content ?? "";
    lastRaw = content;
    const parsed = extractJson(content);
    if (parsed === undefined) {
      lastErrors = ["Output was not valid JSON"];
      // Logged to the Convex function logs — this is how we see what the
      // model actually returned when parsing fails.
      console.log(
        `[workflows] attempt ${attempt}: could not parse model output:`,
        content.slice(0, 1500),
      );
      continue;
    }
    const result = validateWorkflowJson(parsed, callbackUrl);
    if (result.ok && result.workflow) return result.workflow;
    lastErrors = result.errors;
  }
  throw new Error(
    `Could not generate a valid workflow: ${lastErrors.slice(0, 3).join("; ")} — model returned: ${lastRaw.slice(0, 250)}`,
  );
}

/**
 * Server-side fix-ups applied after LLM validation, before create/update on
 * n8n. The LLM is never trusted with uniqueness or secrets:
 * - the webhook path is uniquified per workflow (the prompt's fixed
 *   "dincharya-webhook" would collide across workflows and misroute triggers),
 * - YOUR_N8N_CALLBACK_SECRET is replaced with the real N8N_CALLBACK_SECRET
 *   (the LLM must never see the real secret; validation's placeholder check
 *   lets the marker through for exactly this substitution).
 */
function finalizeWorkflowForN8n(workflow: N8nWorkflow): N8nWorkflow {
  const w = workflow as unknown as Record<string, unknown>;
  const nodes = w.nodes as Array<Record<string, unknown>>;
  const trigger = nodes.find(
    (n) => n.name === "Trigger" && n.type === "n8n-nodes-base.webhook",
  );
  if (trigger) {
    const params = (trigger.parameters ?? {}) as Record<string, unknown>;
    params.path = `dincharya-${crypto.randomUUID().slice(0, 8)}`;
    trigger.parameters = params;
  }
  const secret = process.env.N8N_CALLBACK_SECRET || "";
  if (!secret) return workflow;
  const substitute = (obj: unknown): unknown => {
    if (typeof obj === "string") {
      return obj.split("YOUR_N8N_CALLBACK_SECRET").join(secret);
    }
    if (Array.isArray(obj)) return obj.map(substitute);
    if (obj && typeof obj === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) out[k] = substitute(v);
      return out;
    }
    return obj;
  };
  return substitute(w) as unknown as N8nWorkflow;
}

/** Test runs get a prefixed runId so the UI can hide them from run history. */
const TEST_RUN_PREFIX = "test-";
const TEST_RUN_TIMEOUT_MS = 60_000;
const TEST_POLL_INTERVAL_MS = 3_000;
/** Auto-fix attempts after the initial generation (each = regenerate + retest). */
const MAX_TEST_FIX_ATTEMPTS = 1;

type TestResult =
  | { ok: true }
  | { ok: false; error: string; isGenerationProblem: boolean };

/**
 * Fire a live test run against the workflow's production webhook and wait for
 * the completion callback. This is the same trigger path "Run now" uses, so a
 * passing test genuinely proves the workflow works end to end.
 */
async function runTestAndWait(
  ctx: ActionCtx,
  requestId: Id<"workflowRequests">,
  n8nWorkflowId: string,
  webhookPath: string,
): Promise<TestResult> {
  const runId = `${TEST_RUN_PREFIX}${crypto.randomUUID()}`;
  await ctx.runMutation(internal.workflows.insertRun, { requestId, runId });
  const url = buildProductionWebhookUrl(n8nHost(), webhookPath);
  const triggerTime = Date.now();
  try {
    await triggerWebhook(url, { runId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await ctx.runMutation(internal.workflows.recordRun, {
      runId,
      status: "failed",
      summary: message.slice(0, 500),
    });
    return {
      ok: false,
      error: `Test trigger failed: ${message}`,
      isGenerationProblem: false,
    };
  }
  const deadline = Date.now() + TEST_RUN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, TEST_POLL_INTERVAL_MS));
    const run = await ctx.runQuery(internal.workflows.findRun, { runId });
    if (run && run.status !== "running") {
      if (run.status === "success") return { ok: true };
      return {
        ok: false,
        error: run.summary || "Test run reported failure",
        isGenerationProblem: true,
      };
    }
  }
  // Timed out with no callback: diagnose via the n8n executions API.
  const diag = await diagnoseExecution(n8nWorkflowId, triggerTime).catch(
    () => null,
  );
  if (diag?.outcome === "failed") {
    return {
      ok: false,
      error: `Test run failed${diag.node ? ` at node "${diag.node}"` : ""}: ${diag.message ?? "unknown error"}`,
      isGenerationProblem: true,
    };
  }
  if (diag?.outcome === "success") {
    return {
      ok: false,
      error:
        "Test run executed successfully on n8n but the completion callback never arrived — check N8N_CALLBACK_SECRET and the workflow's report node",
      isGenerationProblem: false,
    };
  }
  return {
    ok: false,
    error:
      "Test run timed out with no callback and no matching n8n execution found — check the webhook URL and that the workflow is active",
    isGenerationProblem: false,
  };
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
    const host = n8nHost();
    const saveProgress = async (
      n8nId: string,
      workflow: N8nWorkflow,
      status: "drafting" | "ready" | "failed",
      error?: string,
    ) => {
      const webhookPath = extractWebhookPath(workflow);
      await ctx.runMutation(internal.workflows.updateRequest, {
        id: requestId,
        status,
        n8nWorkflowId: n8nId,
        n8nUrl: `${host}/workflow/${n8nId}`,
        webhookPath: webhookPath ?? undefined,
        error,
      });
    };
    const activateBestEffort = async (n8nId: string) => {
      try {
        await activateWorkflowOnN8n(n8nId);
      } catch (e) {
        console.warn(
          "n8n auto-activate failed (runNow will retry):",
          e instanceof Error ? e.message : String(e),
        );
      }
    };
    const fail = async (
      n8nId: string | null,
      workflow: N8nWorkflow | null,
      error: string,
    ) => {
      // Keep the n8n link on failed requests so the user can open a broken
      // workflow in n8n to debug it.
      if (n8nId && workflow) {
        await saveProgress(n8nId, workflow, "failed", error.slice(0, 500));
      } else {
        await ctx.runMutation(internal.workflows.updateRequest, {
          id: requestId,
          status: "failed",
          error: error.slice(0, 500),
        });
      }
    };
    try {
      // Fail fast with clear errors when n8n / callback URL are not configured.
      const callbackUrl = getCallbackUrl();
      // A repeated "Try again" reuses the stored n8n id so retries update the
      // existing workflow in place instead of leaving orphaned duplicates.
      let n8nId: string | null = request.n8nWorkflowId ?? null;
      let workflow = finalizeWorkflowForN8n(
        await generateWithRetry(request.prompt, callbackUrl),
      );
      let lastError: string | null = null;

      // Attempt 0 = initial generation; further attempts = auto-fix using the
      // failed test run's log as context. "Ready" is only granted to a
      // workflow that survives a live test execution.
      for (let attempt = 0; attempt <= MAX_TEST_FIX_ATTEMPTS; attempt++) {
        if (attempt > 0 && lastError) {
          workflow = finalizeWorkflowForN8n(
            await generateWithRetry(request.prompt, callbackUrl, [
              `Live test run failed: ${lastError} — fix the workflow so the test passes.`,
            ]),
          );
        }
        if (n8nId) {
          await updateWorkflowOnN8n(
            n8nId,
            workflow as unknown as Record<string, unknown>,
          );
        } else {
          const created = await createWorkflowOnN8n(
            workflow as unknown as Record<string, unknown>,
          );
          n8nId = created.id;
        }
        await activateBestEffort(n8nId);
        const webhookPath = extractWebhookPath(workflow);
        await saveProgress(n8nId, workflow, "drafting");
        if (!webhookPath) {
          lastError = "Could not determine webhook path from generated workflow";
          break;
        }
        const test = await runTestAndWait(ctx, requestId, n8nId, webhookPath);
        if (test.ok) {
          await saveProgress(n8nId, workflow, "ready");
          return;
        }
        lastError = test.error;
        // Config/trigger problems (bad secret, unreachable webhook) can't be
        // fixed by regenerating — surface them instead of looping.
        if (!test.isGenerationProblem) break;
      }
      await fail(n8nId, workflow, lastError ?? "Test run failed");
    } catch (e) {
      const message =
        e instanceof N8nError || e instanceof Error ? e.message : String(e);
      await fail(null, null, message);
    }
  },
});
