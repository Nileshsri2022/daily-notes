/**
 * WorkflowSpec — the constrained plan the LLM generates INSTEAD of raw n8n
 * JSON, plus the deterministic compiler that turns it into an n8n workflow.
 *
 * Why this exists: asking the model to write n8n JSON directly produced a
 * new defect class every week (malformed jsonBody taught by our own example,
 * invented secrets, dead error branches, empty Set nodes). Each needed its
 * own validation rule — whack-a-mole. With this split, the model only
 * describes *what* the workflow does (steps + values); the compiler writes
 * all n8n syntax (nodes, connections, expressions, headers, error branches)
 * identically correct every time, by construction. Whole bug classes become
 * impossible instead of being ruled out one by one.
 *
 * The model never writes {{ }} delimiters: SpecValue is either a literal
 * string or a bare expression, and the compiler wraps expressions.
 */
import { z } from "zod";

import type { N8nWorkflow } from "./n8n";

// ---------------------------------------------------------------------------
// Spec schema (what the LLM outputs)
// ---------------------------------------------------------------------------

const StepNameSchema = z
  .string()
  .min(1)
  .max(24)
  .regex(
    /^[A-Za-z][A-Za-z0-9]*$/,
    "step names must be alphanumeric (they become n8n connection references)",
  );

/**
 * A value is exactly one of: a literal string, or an n8n expression WITHOUT
 * {{ }} delimiters (e.g. `new Date().toISOString()`). The compiler wraps
 * expressions; the model never writes delimiters, so delimiter-format bugs
 * are unrepresentable.
 */
const SpecValueSchema = z
  .object({
    literal: z.string().optional(),
    expression: z.string().min(1).max(500).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const hasLiteral = v.literal !== undefined;
    const hasExpression = v.expression !== undefined;
    if (hasLiteral === hasExpression) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "value must have exactly one of 'literal' or 'expression'",
      });
    }
  });

export type SpecValue = z.infer<typeof SpecValueSchema>;

const SetStepSchema = z
  .object({
    type: z.literal("set"),
    name: StepNameSchema,
    assignments: z
      .array(
        z
          .object({ name: StepNameSchema, value: SpecValueSchema })
          .strict(),
      )
      .min(1, "set steps need at least one assignment")
      .max(10),
  })
  .strict();

const CodeStepSchema = z
  .object({
    type: z.literal("code"),
    name: StepNameSchema,
    // Plain JavaScript for the Code node; must return [{ json: { ... } }].
    code: z.string().min(1).max(2000),
  })
  .strict();

const HttpStepSchema = z
  .object({
    type: z.literal("http"),
    name: StepNameSchema,
    method: z.enum(["GET", "POST", "PUT", "DELETE"]),
    url: z
      .string()
      .url("http step url must be a valid URL")
      .refine((u) => u.startsWith("https://"), "http step url must be https"),
    // Literal strings only — no expressions in generic HTTP bodies (v1).
    body: z.record(z.string(), z.string()).optional(),
  })
  .strict();

const IfStepSchema = z
  .object({
    type: z.literal("if"),
    name: StepNameSchema,
    // Boolean expression without {{ }}, e.g. "$json.count > 5".
    // Both branches continue to the next step (linear flow, v1).
    condition: z.string().min(1).max(500),
  })
  .strict();

const SpecStepSchema = z.discriminatedUnion("type", [
  SetStepSchema,
  CodeStepSchema,
  HttpStepSchema,
  IfStepSchema,
]);

export type SpecStep = z.infer<typeof SpecStepSchema>;

const WorkflowSpecSchema = z
  .object({
    name: z.string().min(1).max(120),
    steps: z.array(SpecStepSchema).min(1).max(6),
    summary: SpecValueSchema,
  })
  .strict();

export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;

/** Translate Zod issues into "path: problem" messages for the LLM retry loop. */
function specIssuesToMessages(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "spec";
    return `${path}: ${issue.message}`;
  });
}

export interface SpecValidationResult {
  ok: boolean;
  errors: string[];
  spec?: WorkflowSpec;
}

/** Validate raw LLM output against the spec schema. */
export function validateWorkflowSpec(input: unknown): SpecValidationResult {
  const parsed = WorkflowSpecSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: specIssuesToMessages(parsed.error) };
  }
  const errors: string[] = [];
  const stepNames = new Set<string>();
  for (const step of parsed.data.steps) {
    if (stepNames.has(step.name)) {
      errors.push(`steps: duplicate step name "${step.name}"`);
    }
    stepNames.add(step.name);
    if (step.type === "set") {
      const assignmentNames = new Set<string>();
      for (const a of step.assignments) {
        if (assignmentNames.has(a.name)) {
          errors.push(
            `steps.${step.name}: duplicate assignment name "${a.name}"`,
          );
        }
        assignmentNames.add(a.name);
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], spec: parsed.data };
}

// ---------------------------------------------------------------------------
// Compiler (spec → n8n workflow JSON, deterministic)
// ---------------------------------------------------------------------------

export interface CompileOpts {
  callbackUrl: string;
  /** Webhook path; finalizeWorkflowForN8n uniquifies it afterwards. */
  webhookPath: string;
}

/** The placeholder the compiler writes; replaced with the real secret server-side. */
export const CALLBACK_SECRET_PLACEHOLDER = "YOUR_N8N_CALLBACK_SECRET";

type CompiledNode = N8nWorkflow["nodes"][number];

/** Render a SpecValue as an n8n field value (expression wrapped, literal plain). */
function compileValue(v: SpecValue): string {
  return v.expression !== undefined ? `={{${v.expression}}}` : v.literal ?? "";
}

/** Render a SpecValue as a JSON string fragment for jsonBody. */
function compileJsonValue(v: SpecValue): string {
  return v.expression !== undefined
    ? `"={{${v.expression}}}"`
    : JSON.stringify(v.literal ?? "");
}

function buildStepNode(step: SpecStep, id: string, index: number): CompiledNode {
  const position: [number, number] = [(index + 1) * 220, 0];
  switch (step.type) {
    case "set":
      return {
        id,
        name: step.name,
        type: "n8n-nodes-base.set",
        typeVersion: 3,
        position,
        parameters: {
          assignments: {
            assignments: step.assignments.map((a, j) => ({
              id: `assign-${index}-${j}`,
              name: a.name,
              value: compileValue(a.value),
              type: "string",
            })),
          },
          options: {},
        },
      };
    case "code":
      return {
        id,
        name: step.name,
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position,
        parameters: { mode: "runOnceForAllItems", jsCode: step.code },
      };
    case "http": {
      const params: Record<string, unknown> = {
        method: step.method,
        url: step.url,
        options: {},
      };
      if (step.body) {
        params.sendBody = true;
        params.specifyBody = "json";
        params.jsonBody = JSON.stringify(step.body);
      }
      return {
        id,
        name: step.name,
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position,
        parameters: params,
      };
    }
    case "if":
      // IF v2: filter-type conditions; structure grounded in n8n's IfV2 source
      // (outputs ['true','false'], boolean operator for "is true").
      return {
        id,
        name: step.name,
        type: "n8n-nodes-base.if",
        typeVersion: 2,
        position,
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: "",
              typeValidation: "loose",
              version: 1,
            },
            conditions: [
              {
                id: `cond-${index}`,
                leftValue: `={{${step.condition}}}`,
                rightValue: "",
                operator: { type: "boolean", operation: "true" },
              },
            ],
            combinator: "and",
          },
          options: {},
          looseTypeValidation: true,
        },
      };
  }
}

function buildCallbackNode(
  id: string,
  index: number,
  kind: "success" | "failed",
  callbackUrl: string,
  summary: SpecValue | null,
): CompiledNode {
  const summaryFragment =
    kind === "success"
      ? compileJsonValue(
          summary ?? { literal: "done" },
        )
      : `"={{ $json.error.message }}"`;
  return {
    id,
    name: kind === "success" ? "ReportBack" : "ErrorReport",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [index * 220, kind === "success" ? 0 : 220],
    parameters: {
      method: "POST",
      url: callbackUrl,
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "X-Callback-Secret", value: CALLBACK_SECRET_PLACEHOLDER },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      // Plain JSON with embedded {{ }} — deliberately NO leading "=" (a
      // =-prefixed body would send the expressions as literal text).
      jsonBody: `{"runId": "={{ $('Trigger').item.json.body.runId }}", "status": "${kind}", "summary": ${summaryFragment}}`,
      options: {},
    },
  };
}

interface ConnectionTarget {
  node: string;
  type: string;
  index: number;
}

/**
 * Deterministically compile a validated spec into an n8n workflow.
 * By construction: webhook trigger first, linear main chain, IF true/false
 * both continue, every node has onError + an error branch to ErrorReport,
 * every terminal path ends at a callback node.
 */
export function compileSpecToN8n(
  spec: WorkflowSpec,
  opts: CompileOpts,
): N8nWorkflow {
  const nodes: CompiledNode[] = [];
  const target = (node: string): ConnectionTarget => ({
    node,
    type: "main",
    index: 0,
  });

  nodes.push({
    id: "a1",
    name: "Trigger",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [0, 0],
    parameters: {
      httpMethod: "POST",
      path: opts.webhookPath,
      responseMode: "onReceived",
      options: {},
    },
  });

  spec.steps.forEach((step, i) => {
    nodes.push(buildStepNode(step, `a${i + 2}`, i));
  });

  const reportBack = buildCallbackNode(
    `a${spec.steps.length + 2}`,
    spec.steps.length + 1,
    "success",
    opts.callbackUrl,
    spec.summary,
  );
  const errorReport = buildCallbackNode(
    `a${spec.steps.length + 3}`,
    spec.steps.length + 1,
    "failed",
    opts.callbackUrl,
    null,
  );
  nodes.push(reportBack, errorReport);

  const connections: Record<string, Record<string, ConnectionTarget[][]>> = {};
  const chain = ["Trigger", ...spec.steps.map((s) => s.name), "ReportBack"];
  chain.forEach((fromName, i) => {
    const to = target(chain[i + 1]);
    const fromNode = nodes.find((n) => n.name === fromName);
    connections[fromName] =
      fromNode?.type === "n8n-nodes-base.if"
        ? { main: [[to], [to]] } // true and false outputs both continue
        : { main: [[to]] };
  });
  // Every non-callback node reports failures; without onError the error
  // branch would be dead, so the compiler sets it wherever it wires one.
  for (const node of nodes) {
    if (node.name === "ErrorReport") continue;
    node.onError = "continueErrorOutput";
    const existing = connections[node.name] ?? {};
    connections[node.name] = {
      ...existing,
      error: [[target("ErrorReport")]],
    };
  }

  return {
    name: spec.name,
    nodes,
    connections: connections as unknown as Record<string, unknown>,
    settings: {},
  } as unknown as N8nWorkflow;
}

// ---------------------------------------------------------------------------
// Prompt (teaches the SPEC, not n8n JSON — the example cannot be "wrong"
// in a dangerous way because it contains no n8n syntax at all)
// ---------------------------------------------------------------------------

export function buildSpecPrompt(userText: string): {
  system: string;
  user: string;
} {
  const system = `You generate a WorkflowSpec — a small JSON plan for an n8n workflow. Output ONLY the JSON, no prose, no markdown fences.

SHAPE:
{
  "name": "Dincharya: <short title>",
  "steps": [ 1 to 6 steps ],
  "summary": <value>
}

A <value> is { "literal": "fixed text" } OR { "expression": "n8n expression WITHOUT {{ }}" } — exactly one of the two, never with {{ }} delimiters.

STEP TYPES:
- { "type": "set", "name": "AlphanumericName", "assignments": [{ "name": "x", "value": <value> }, ...] } — compute values (1-10 assignments).
- { "type": "code", "name": "...", "code": "javascript..." } — plain JavaScript; MUST return [{ json: { ... } }]. Input items: $input.all().
- { "type": "http", "name": "...", "method": "GET|POST|PUT|DELETE", "url": "https://...", "body": { "k": "literal" } } — body values are literals only.
- { "type": "if", "name": "...", "condition": "boolean expression WITHOUT {{ }}, e.g. $json.count > 5" } — both branches continue to the next step.

RULES:
- Step names: alphanumeric, unique, max 24 chars.
- The workflow is triggered by webhook and always ends by reporting back — you do NOT define the trigger or the reporting, only the steps and the summary.
- Keep it to 6 steps or fewer. Prefer simple over clever.

EXAMPLE:
{
  "name": "Dincharya: Current date and time",
  "steps": [
    { "type": "set", "name": "GetDateTime", "assignments": [{ "name": "now", "value": { "expression": "new Date().toISOString()" } }] }
  ],
  "summary": { "expression": "$json.now" }
}`;
  return { system, user: userText };
}
