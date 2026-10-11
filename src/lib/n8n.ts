// Pure helpers for the Dincharya × n8n prompt-to-workflow integration.
// No React Native imports: safe to import from Convex backend code too.

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
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Workflow must be a JSON object"] };
  }
  const w = input as Record<string, unknown>;

  if (typeof w.name !== "string" || !w.name.trim()) {
    errors.push('Missing or empty "name"');
  }
  if (!Array.isArray(w.nodes) || w.nodes.length === 0) {
    errors.push('Missing or empty "nodes" array');
  }
  if (
    !w.connections ||
    typeof w.connections !== "object" ||
    Array.isArray(w.connections)
  ) {
    errors.push('Missing or invalid "connections" object');
  }
  if (errors.length > 0) return { ok: false, errors };

  const nodes = w.nodes as Array<Record<string, unknown>>;
  const names = new Set<string>();
  const allowed = new Set<string>(ALLOWED_NODE_TYPES);
  nodes.forEach((n, i) => {
    const where = `nodes[${i}]`;
    for (const field of [
      "id",
      "name",
      "type",
      "typeVersion",
      "position",
      "parameters",
    ]) {
      if (n[field] === undefined) errors.push(`${where}: missing "${field}"`);
    }
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

  const callbackNode = nodes.find(
    (n) =>
      n.type === HTTP_NODE_TYPE &&
      JSON.stringify(n.parameters ?? {}).includes(callbackUrl),
  );
  if (!callbackNode) {
    errors.push(
      `Workflow must include an HTTP Request node POSTing to the callback URL (${callbackUrl})`,
    );
  } else if (
    !JSON.stringify(callbackNode.parameters ?? {}).includes("runId")
  ) {
    errors.push("Callback node must forward the runId in its request body");
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
