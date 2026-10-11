// Pure helpers for the Dincharya × n8n prompt-to-workflow integration.
// No React Native imports: safe to import from Convex backend code too.

import { z } from "zod";

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
}

export interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

/** Node types the LLM is allowed to emit. Kept small on purpose. */
export const ALLOWED_NODE_TYPES = [
  "n8n-nodes-base.webhook",
  "n8n-nodes-base.httpRequest",
  "n8n-nodes-base.scheduleTrigger",
  "n8n-nodes-base.code",
  "n8n-nodes-base.if",
  "n8n-nodes-base.set",
  "@n8n/n8n-nodes-langchain.agent",
] as const;

export const WEBHOOK_NODE_TYPE = "n8n-nodes-base.webhook";
export const HTTP_NODE_TYPE = "n8n-nodes-base.httpRequest";

// ---------------------------------------------------------------------------
// Structural validation via Zod. The semantic rules (allowed node types,
// webhook-first, callback reporting, secret scanning) stay as custom code
// below — Zod can't express those, and their messages feed the LLM retry loop.
// ---------------------------------------------------------------------------

const N8nNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  typeVersion: z.number(),
  position: z.tuple([z.number(), z.number()]),
  parameters: z.record(z.string(), z.unknown()),
  credentials: z
    .record(z.string(), z.object({ id: z.string(), name: z.string() }))
    .optional(),
});

const N8nWorkflowSchema = z.object({
  name: z.string().min(1),
  nodes: z.array(N8nNodeSchema).min(1),
  connections: z.record(z.string(), z.unknown()),
  settings: z.record(z.string(), z.unknown()).optional(),
});

/** True when the issue is a field that was absent entirely (not mistyped). */
function isMissingIssue(issue: z.ZodIssue): boolean {
  if (issue.code !== "invalid_type") return false;
  if ("received" in issue) {
    return (issue as { received?: unknown }).received === undefined;
  }
  return /received undefined/i.test(issue.message);
}

/**
 * Translate Zod issues into the short "path: problem" messages the LLM
 * retry loop consumes, keeping the vocabulary the pipeline already expects.
 */
function zodIssuesToMessages(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path;
    if (path.length === 0) return "Workflow must be a JSON object";
    if (path.length === 1) {
      const field = String(path[0]);
      if (field === "name") return 'Missing or empty "name"';
      if (field === "nodes") return 'Missing or empty "nodes" array';
      if (field === "connections") return 'Missing or invalid "connections" object';
      return `${field}: ${issue.message}`;
    }
    if (path[0] === "nodes" && typeof path[1] === "number") {
      const field = path.slice(2).join(".");
      if (isMissingIssue(issue)) return `nodes[${path[1]}]: missing "${field}"`;
      return `nodes[${path[1]}]: invalid "${field}" — ${issue.message}`;
    }
    return `${path.map(String).join(".")}: ${issue.message}`;
  });
}

/**
 * Cheap intent check: does this text ask to create an automation workflow?
 * Runs on the raw transcript/prompt, before any LLM call.
 */
export function detectWorkflowIntent(text: string): boolean {
  if (!text || !text.trim()) return false;
  return /\b(create|make|build|set\s?up)\s+(a|an|the|this)?\s*(n8n\s+)?(workflow|automation)\b|\bautomate\b/i.test(
    text,
  );
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  workflow?: N8nWorkflow;
}

const SECRET_KEY_PATTERN =
  /password|passwd|api[_-]?key|secret|token|credentials?/i;
const SECRET_VALUE_PATTERN =
  /(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|xox[bap]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[A-Za-z0-9_-]{20,})/;

function looksLikePlaceholder(value: string): boolean {
  const v = value.trim();
  return (
    v === "" ||
    /^(your|fill|todo|change|replace|example|placeholder)/i.test(v) ||
    /[<>[\]]/.test(v)
  );
}

function findSecrets(obj: unknown, path: string, hits: string[]): void {
  if (typeof obj === "string") {
    if (SECRET_VALUE_PATTERN.test(obj)) {
      hits.push(`${path || "workflow"}: looks like an embedded secret`);
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => findSecrets(v, `${path}[${i}]`, hits));
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const childPath = path ? `${path}.${k}` : k;
      if (
        typeof v === "string" &&
        SECRET_KEY_PATTERN.test(k) &&
        v.trim() !== "" &&
        !looksLikePlaceholder(v)
      ) {
        hits.push(`${childPath}: possible hardcoded secret`);
      } else {
        findSecrets(v, childPath, hits);
      }
    }
  }
}

function collectTargetNames(value: unknown, out: Set<string>): void {
  if (Array.isArray(value)) {
    value.forEach((v) => collectTargetNames(v, out));
    return;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.node === "string") {
      out.add(o.node);
    } else {
      Object.values(o).forEach((v) => collectTargetNames(v, out));
    }
  }
}

/**
 * Validate LLM-generated n8n workflow JSON. n8n itself is the final
 * validator (POST /api/v1/workflows), but these checks catch the common
 * failure modes before we ever hit the network — and their messages feed
 * the LLM retry loop.
 */
export function validateWorkflowJson(
  input: unknown,
  callbackUrl: string,
): ValidationResult {
  const errors: string[] = [];
  const parsed = N8nWorkflowSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: zodIssuesToMessages(parsed.error) };
  }
  const w = parsed.data as unknown as Record<string, unknown>;

  const nodes = w.nodes as Array<Record<string, unknown>>;
  const names = new Set<string>();
  const allowed = new Set<string>(ALLOWED_NODE_TYPES);
  nodes.forEach((n, i) => {
    const where = `nodes[${i}]`;
    if (typeof n.name === "string") {
      if (names.has(n.name)) {
        errors.push(`${where}: duplicate node name "${n.name}"`);
      }
      names.add(n.name);
    }
    if (typeof n.type === "string" && !allowed.has(n.type)) {
      errors.push(`${where}: node type "${n.type}" is not in the allowed list`);
    }
  });

  const conns = w.connections as Record<string, unknown>;
  const targets = new Set<string>();
  for (const [from, v] of Object.entries(conns)) {
    if (!names.has(from)) {
      errors.push(`connections: unknown source node "${from}"`);
    }
    collectTargetNames(v, targets);
  }
  for (const t of targets) {
    if (!names.has(t)) {
      errors.push(`connections: unknown target node "${t}"`);
    }
  }

  const webhookNodes = nodes.filter((n) => n.type === WEBHOOK_NODE_TYPE);
  if (webhookNodes.length === 0) {
    errors.push(
      "Workflow must include a Webhook Trigger node (n8n-nodes-base.webhook)",
    );
  }

  const callbackNodes = nodes.filter(
    (n) =>
      n.type === HTTP_NODE_TYPE &&
      JSON.stringify(n.parameters ?? {}).includes(callbackUrl),
  );
  if (callbackNodes.length === 0) {
    errors.push(
      `Workflow must include an HTTP Request node POSTing to the callback URL (${callbackUrl})`,
    );
  } else {
    for (const node of callbackNodes) {
      const paramsJson = JSON.stringify(node.parameters ?? {});
      if (!paramsJson.includes("runId")) {
        errors.push(
          `Callback node "${node.name}" must forward the runId in its request body`,
        );
      } else if (
        !/\$\(['"]Trigger['"]\)\.item\.json\.body\.runId/.test(paramsJson)
      ) {
        // Webhook input is nested under "body" — without it the callback
        // carries runId: undefined and the run is never matched.
        errors.push(
          `Callback node "${node.name}" must reference the runId as {{ $('Trigger').item.json.body.runId }}`,
        );
      }
    }
  }

  findSecrets(w, "", errors);

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], workflow: w as unknown as N8nWorkflow };
}

/** Read the webhook path from the workflow's Webhook Trigger node. */
export function extractWebhookPath(workflow: N8nWorkflow): string | null {
  const node = workflow.nodes.find((n) => n.type === WEBHOOK_NODE_TYPE);
  if (!node) return null;
  const params = (node.parameters ?? {}) as Record<string, unknown>;
  const raw = typeof params.path === "string" ? params.path : null;
  if (!raw || !raw.trim()) return null;
  return raw.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function buildProductionWebhookUrl(host: string, path: string): string {
  return `${host.replace(/\/+$/, "")}/webhook/${path}`;
}

/**
 * Pull a JSON value out of an LLM response. Small free models rarely obey
 * "output ONLY valid JSON" — they add a lead-in sentence, wrap the JSON in
 * markdown fences, or append trailing commentary. Try, in order: any fenced
 * code block, the span from the first "{" to the last "}", then the raw text.
 * Returns undefined when nothing parses.
 */
export function extractJson(raw: string): unknown {
  const candidates: string[] = [];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1]);
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) candidates.push(raw.slice(start, end + 1));
  candidates.push(raw);
  for (const candidate of candidates) {
    const text = candidate.trim();
    if (!text) continue;
    try {
      return JSON.parse(text);
    } catch {
      /* try the next candidate */
    }
  }
  return undefined;
}
