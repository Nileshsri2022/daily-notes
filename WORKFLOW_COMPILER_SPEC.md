# Workflow Compiler Spec — template + slot-fill generation

## 1. Problem

The LLM currently generates raw n8n workflow JSON. n8n's node schemas and
expression syntax are niche and ungrounded, so the model produces
plausible-but-broken output. Every fix so far has been whack-a-mole: a
specific defect → a specific validation rule, growing one incident at a time:

- prompt-taught malformed `jsonBody` (`=`-prefixed with nested `{{ }}`)
- invented callback secrets bypassing placeholder substitution
- empty no-op Set nodes, dead error branches, wrong runId paths

The general problem: **we ask a probabilistic generator to write a
machine-exact artifact in one shot, then patch each mistake with a rule.**
The mistake space is unbounded; the rule list grows forever.

## 2. Solution

Split generation into two phases:

1. **LLM → WorkflowSpec** — a small, constrained JSON describing *what* the
   workflow does (steps + values). No n8n syntax of any kind.
2. **Compiler → n8n JSON** — deterministic TypeScript that builds the exact
   n8n workflow: nodes, connections, expressions, headers, error branches.

The model never writes `jsonBody`, `connections`, headers, `onError`,
`typeVersion`s, positions, or webhook config. The compiler writes all of
that — identically correct every time, by construction. Bug classes
disappear instead of being ruled out one by one.

## 3. The WorkflowSpec format

```ts
// A value is EITHER a literal string OR an n8n expression — never both,
// and the model never writes {{ }} delimiters itself.
type SpecValue = { literal: string } | { expression: string };

interface SpecAssignment {
  name: string; // e.g. "now", "summary"
  value: SpecValue;
}

type SpecStep =
  | { type: "set"; name: string; assignments: SpecAssignment[] } // 1..10
  | { type: "code"; name: string; code: string } // plain JS, see contract below
  | {
      type: "http";
      name: string;
      method: "GET" | "POST" | "PUT" | "DELETE";
      url: string; // https only
      body?: Record<string, string>; // literal strings only
    }
  | { type: "if"; name: string; condition: string }; // boolean expression, no {{ }}

interface WorkflowSpec {
  name: string; // "Dincharya: <short title>"
  steps: SpecStep[]; // 1..6, unique names
  summary: SpecValue; // what the success callback reports
}
```

Contracts the prompt teaches (one line each):

- `expression` is raw n8n expression source, e.g. `new Date().toISOString()`.
  The compiler wraps it as `={{...}}`. The model never writes `{{` or `}}`.
- `code` is a Code-node script: plain JavaScript, must
  `return [{ json: { ... } }]`. Input items are available as `$input.all()`.
- `if.condition` is a boolean expression, e.g. `$json.count > 5`. Both the
  true and false branches continue to the next step (linear flow, v1).

## 4. The compiler — `compileSpecToN8n(spec, opts)`

`opts: { callbackUrl: string; webhookPath: string }`

Builds, deterministically:

- **Trigger** (`n8n-nodes-base.webhook`, v2): POST, `path: webhookPath`,
  `responseMode: "onReceived"`.
- One node per spec step (`set` v3 / `code` v2 / `httpRequest` v4.2 / `if` v2),
  positions spaced 220px on one row:
  - `set`: `parameters.assignments.assignments[]` with generated ids;
    expressions wrapped as `={{...}}`, literals emitted plain.
  - `code`: `parameters.jsCode = code`.
  - `http`: method/url/`sendBody`+literal JSON body when `body` present.
  - `if`: boolean condition compiled to the IF node's condition structure
    with `leftValue: "={{<condition>}}"`, operator boolean/true.
- **ReportBack** (`httpRequest` v4.2): POST `callbackUrl`, header
  `X-Callback-Secret: YOUR_N8N_CALLBACK_SECRET` (overwritten with the real
  secret by `finalizeWorkflowForN8n`), body exactly:
  `{"runId": "={{ $('Trigger').item.json.body.runId }}", "status": "success", "summary": <compiled summary>}`
  — written by the compiler, never by the model.
- **ErrorReport**: same endpoint, `"status": "failed"`,
  `"summary": "={{ $json.error.message }}"`.
- **Connections**: linear `main` chain Trigger → steps → ReportBack. IF
  true/false outputs both wire to the next step. Every non-callback node
  gets `onError: "continueErrorOutput"` plus an `error` connection to
  ErrorReport. Every terminal path ends at a callback node — enforced by
  construction, not validated after the fact.

## 5. Spec validation (Zod, strict)

`validateWorkflowSpec(spec)` rejects with retry-loop-friendly messages:

- `name`: 1–120 chars.
- `steps`: 1–6 items; names unique, `/^[A-Za-z][A-Za-z0-9]*$/`, ≤24 chars
  (they become connection references).
- `set`: 1–10 assignments; assignment names unique within the step.
- `code`: 1–2000 chars.
- `http`: `url` must be https; `method` from the enum.
- `if`: `condition` non-empty.
- `summary`: present.
- Unknown step `type`s rejected (strict discriminated union).

## 6. Pipeline changes (`convex/workflows.ts`)

```
note text
  → buildSpecPrompt()            # small prompt: spec format + tiny spec example
  → generateSpecWithRetry()      # LLM → spec JSON → validateWorkflowSpec (2 attempts)
  → compileSpecToN8n()           # deterministic; no retry needed
  → assert validateWorkflowJson  # defense in depth: compiler output must pass;
                                 # failure here is OUR bug → throw, don't retry LLM
  → finalizeWorkflowForN8n()     # unchanged: unique path, real secret overwrite
  → create/update + activate     # unchanged
  → live test + diagnose         # unchanged
  → repair loop                  # unchanged, but regenerates the SPEC (not JSON)
```

What stays: `requestFromNote`, dedupe, `runNow`, `retryRequest`, progress
log, 7-minute guard, fetch timeouts, test-on-generate, `diagnoseExecution`,
the `validateWorkflowJson` safety net in `src/lib/n8n.ts`.

What goes: the n8n-JSON system prompt and its few-shot example (the source
of prompt-taught defects), `generateWithRetry` for raw JSON.

## 7. What the LLM can still get wrong (honest scope)

- **Expression typos** (`$new Date()`) — caught by the live test, repaired
  via the spec-regeneration loop. Smaller surface than before (values only,
  never structure).
- **Wrong logic** (backwards condition, wrong URL) — the test catches
  runtime failures; semantic wrongness needs a human.
- **Code-node bugs** — same as above.

What becomes impossible: malformed `jsonBody`, secret mishandling, broken
connections, dead error branches, empty Set nodes, runId path errors,
webhook path collisions (still uniquified in finalize).

## 8. Files

- NEW `src/lib/workflow-spec.ts` — spec Zod schema, `validateWorkflowSpec`,
  `compileSpecToN8n`, `buildSpecPrompt`.
- MODIFY `convex/workflows.ts` — spec pipeline (prompt, generate, compile,
  assert, rest unchanged).
- NEW `tests/workflow-spec.spec.ts` — spec validation tests; compiler tests
  including the invariant **compiled output always passes
  `validateWorkflowJson`**.
- `src/lib/n8n.ts` — unchanged, kept as the post-compile safety net.

## 9. Verification

- `npx tsc --noEmit` clean.
- `npx eslint` on touched files: 0 errors.
- Playwright suite passes, including new compiler tests.
- Manual: deploy via `npx convex dev`, create a note
  ("create a workflow that returns the current date and time"), confirm the
  card reaches Ready with a correct summary.
