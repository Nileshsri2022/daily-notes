import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Completion callback for n8n workflows. The generated workflow's final node
 * POSTs here when a run finishes so the app can track execution status.
 *
 * Body: { runId: string, status: "running" | "success" | "failed", summary?: string }
 * Auth: X-Callback-Secret header must match N8N_CALLBACK_SECRET.
 */
http.route({
  path: "/n8n-callback",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secret = req.headers.get("X-Callback-Secret");
    if (!secret || secret !== process.env.N8N_CALLBACK_SECRET) {
      return new Response("Forbidden", { status: 403 });
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const runId = b.runId;
    const status = b.status;
    const summary = b.summary;
    if (
      typeof runId !== "string" ||
      (status !== "running" && status !== "success" && status !== "failed") ||
      (summary !== undefined && typeof summary !== "string")
    ) {
      return new Response("Bad request", { status: 400 });
    }
    const existing = await ctx.runQuery(internal.workflows.findRun, { runId });
    if (!existing) {
      return new Response("Unknown runId", { status: 404 });
    }
    await ctx.runMutation(internal.workflows.recordRun, {
      runId,
      status,
      summary,
    });
    return new Response("ok", { status: 200 });
  }),
});

export default http;
