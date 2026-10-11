import { test, expect } from "@playwright/test";
import {
  buildProductionWebhookUrl,
  detectWorkflowIntent,
  extractJson,
  extractWebhookPath,
  validateWorkflowJson,
  type N8nWorkflow,
} from "../src/lib/n8n";

const CALLBACK = "https://glorious-panda-123.convex.site/n8n-callback";

function validWorkflow(): Record<string, unknown> {
  return {
    name: "Dincharya: Book IRCTC ticket",
    nodes: [
      {
        id: "a1",
        name: "Trigger",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [0, 0],
        parameters: {
          httpMethod: "POST",
          path: "dincharya-webhook",
          responseMode: "onReceived",
        },
      },
      {
        id: "a2",
        name: "DoWork",
        type: "n8n-nodes-base.set",
        typeVersion: 3,
        position: [200, 0],
        parameters: {
          assignments: {
            assignments: [
              { id: "x1", name: "summary", value: "done", type: "string" },
            ],
          },
        },
      },
      {
        id: "a3",
        name: "ReportBack",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4,
        position: [400, 0],
        parameters: {
          method: "POST",
          url: CALLBACK,
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: "X-Callback-Secret", value: "YOUR_N8N_CALLBACK_SECRET" },
            ],
          },
          jsonBody:
            '{"runId": "{{ $(\'Trigger\').item.json.body.runId }}", "status": "success"}',
        },
      },
    ],
    connections: {
      Trigger: { main: [[{ node: "DoWork", type: "main", index: 0 }]] },
      DoWork: { main: [[{ node: "ReportBack", type: "main", index: 0 }]] },
    },
    settings: { executionOrder: "v1" },
  };
}

test("detectWorkflowIntent matches creation requests", () => {
  expect(detectWorkflowIntent("create a workflow to book a ticket on irctc")).toBe(
    true,
  );
  expect(detectWorkflowIntent("Can you make a workflow for daily reminders?")).toBe(
    true,
  );
  expect(detectWorkflowIntent("set up an n8n workflow for expenses")).toBe(true);
  expect(detectWorkflowIntent("automate my morning routine")).toBe(true);
  expect(detectWorkflowIntent("build an automation to track prices")).toBe(true);
});

test("detectWorkflowIntent rejects non-requests", () => {
  expect(detectWorkflowIntent("my workflow today was busy")).toBe(false);
  expect(detectWorkflowIntent("I love the new workflow at work")).toBe(false);
  expect(detectWorkflowIntent("had dinner with friends")).toBe(false);
  expect(detectWorkflowIntent("")).toBe(false);
  expect(detectWorkflowIntent("   ")).toBe(false);
});

test("validateWorkflowJson accepts a valid workflow", () => {
  const result = validateWorkflowJson(validWorkflow(), CALLBACK);
  expect(result.ok).toBe(true);
  expect(result.errors).toEqual([]);
  expect(result.workflow?.name).toBe("Dincharya: Book IRCTC ticket");
});

test("validateWorkflowJson rejects non-objects and missing sections", () => {
  expect(validateWorkflowJson(null, CALLBACK).ok).toBe(false);
  expect(validateWorkflowJson("nope", CALLBACK).ok).toBe(false);
  expect(validateWorkflowJson({}, CALLBACK).errors).toContain(
    'Missing or empty "nodes" array',
  );
  expect(validateWorkflowJson({ name: "x", nodes: [] }, CALLBACK).errors).toContain(
    'Missing or empty "nodes" array',
  );
});

test("validateWorkflowJson checks node fields and types", () => {
  const w = validWorkflow();
  (w.nodes as Record<string, unknown>[])[1] = {
    id: "a2",
    name: "DoWork",
    type: "n8n-nodes-base.madeUpNode",
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  };
  const result = validateWorkflowJson(w, CALLBACK);
  expect(result.ok).toBe(false);
  expect(result.errors.some((e) => e.includes("not in the allowed list"))).toBe(
    true,
  );

  const w2 = validWorkflow();
  delete (w2.nodes as Record<string, unknown>[])[0].parameters;
  expect(
    validateWorkflowJson(w2, CALLBACK).errors.some((e) =>
      e.includes('missing "parameters"'),
    ),
  ).toBe(true);
});

test("validateWorkflowJson checks connections reference real nodes", () => {
  const w = validWorkflow();
  (w.connections as Record<string, unknown>).DoWork = {
    main: [[{ node: "Ghost", type: "main", index: 0 }]],
  };
  const result = validateWorkflowJson(w, CALLBACK);
  expect(result.ok).toBe(false);
  expect(result.errors.some((e) => e.includes('unknown target node "Ghost"'))).toBe(
    true,
  );
});

test("validateWorkflowJson requires webhook trigger and callback node", () => {
  const w = validWorkflow();
  w.nodes = (w.nodes as Record<string, unknown>[]).filter(
    (n) => n.type !== "n8n-nodes-base.webhook",
  );
  expect(
    validateWorkflowJson(w, CALLBACK).errors.some((e) =>
      e.includes("Webhook Trigger"),
    ),
  ).toBe(true);

  const w2 = validWorkflow();
  w2.nodes = (w2.nodes as Record<string, unknown>[]).filter(
    (n) => n.type !== "n8n-nodes-base.httpRequest",
  );
  expect(
    validateWorkflowJson(w2, CALLBACK).errors.some((e) =>
      e.includes("callback URL"),
    ),
  ).toBe(true);
});

test("validateWorkflowJson requires body.runId in callback nodes", () => {
  // The fixed fixture uses the correct expression and must pass.
  expect(validateWorkflowJson(validWorkflow(), CALLBACK).ok).toBe(true);

  // A bare item.json.runId (webhook input nests under body) must fail with
  // the fix instruction, so the retry loop can correct it.
  const w = validWorkflow();
  const report = (w.nodes as Record<string, unknown>[]).find(
    (n) => n.name === "ReportBack",
  ) as Record<string, unknown>;
  (report.parameters as Record<string, unknown>).jsonBody =
    '{"runId": "{{ $(\'Trigger\').item.json.runId }}", "status": "success"}';
  const result = validateWorkflowJson(w, CALLBACK);
  expect(result.ok).toBe(false);
  expect(result.errors.some((e) => e.includes("body.runId"))).toBe(true);
});

test("validateWorkflowJson flags hardcoded secrets but allows placeholders", () => {
  const w = validWorkflow();
  ((w.nodes as Record<string, unknown>[])[1].parameters as Record<string, unknown>).password =
    "hunter2-hunter2-hunter2";
  expect(validateWorkflowJson(w, CALLBACK).ok).toBe(false);

  const w2 = validWorkflow();
  ((w2.nodes as Record<string, unknown>[])[1].parameters as Record<string, unknown>).password =
    "YOUR_PASSWORD_HERE";
  expect(validateWorkflowJson(w2, CALLBACK).ok).toBe(true);

  const w3 = validWorkflow();
  ((w3.nodes as Record<string, unknown>[])[1].parameters as Record<string, unknown>).apiKey =
    "sk-abcdefghijklmnopqrstuvwxyz123456";
  expect(validateWorkflowJson(w3, CALLBACK).ok).toBe(false);
});

test("extractWebhookPath reads and trims the trigger path", () => {
  const w = validWorkflow() as unknown as N8nWorkflow;
  expect(extractWebhookPath(w)).toBe("dincharya-webhook");

  const w2 = validWorkflow() as unknown as N8nWorkflow;
  (w2.nodes[0].parameters as Record<string, unknown>).path = "/custom/path/";
  expect(extractWebhookPath(w2)).toBe("custom/path");

  const w3 = validWorkflow() as unknown as N8nWorkflow;
  w3.nodes = w3.nodes.filter((n) => n.type !== "n8n-nodes-base.webhook");
  expect(extractWebhookPath(w3)).toBeNull();
});

test("buildProductionWebhookUrl joins host and path", () => {
  expect(buildProductionWebhookUrl("https://n8n.example.com/", "hook")).toBe(
    "https://n8n.example.com/webhook/hook",
  );
});

test("validateWorkflowJson reports Zod structural problems clearly", () => {
  const w = validWorkflow();
  w.name = "";
  expect(validateWorkflowJson(w, CALLBACK).errors).toContain(
    'Missing or empty "name"',
  );

  const w2 = validWorkflow();
  (w2.nodes as Record<string, unknown>[])[0].position = "left";
  expect(
    validateWorkflowJson(w2, CALLBACK).errors.some(
      (e) => e.includes("nodes[0]") && e.includes("position"),
    ),
  ).toBe(true);

  const w3 = validWorkflow();
  (w3.nodes as Record<string, unknown>[])[1].name = "Trigger";
  expect(
    validateWorkflowJson(w3, CALLBACK).errors.some((e) =>
      e.includes('duplicate node name "Trigger"'),
    ),
  ).toBe(true);
});

test("extractJson parses bare JSON", () => {
  const raw = JSON.stringify(validWorkflow());
  expect(extractJson(raw)).toEqual(validWorkflow());
});

test("extractJson handles fenced JSON at the start", () => {
  const raw = "```json\n" + JSON.stringify(validWorkflow()) + "\n```";
  expect(extractJson(raw)).toEqual(validWorkflow());
});

test("extractJson handles preamble, fences, and trailing commentary", () => {
  // This is what the free model actually returns — the old parser choked on it.
  const raw =
    "Here's your n8n workflow:\n```json\n" +
    JSON.stringify(validWorkflow()) +
    "\n```\nLet me know if you want any changes!";
  expect(extractJson(raw)).toEqual(validWorkflow());
});

test("extractJson handles prose-wrapped JSON without fences", () => {
  const raw =
    "Sure, here it is: " + JSON.stringify(validWorkflow()) + " — enjoy!";
  expect(extractJson(raw)).toEqual(validWorkflow());
});

test("extractJson returns undefined for non-JSON text", () => {
  expect(extractJson("Sorry, I cannot do that.")).toBeUndefined();
  expect(extractJson("")).toBeUndefined();
  expect(extractJson("{ not json")).toBeUndefined();
});

test("validateWorkflowJson rejects =-prefixed jsonBody (expressions would be sent literally)", () => {
  // Regression: the prompt's own example once taught this malformed form —
  // a leading "=" makes n8n evaluate the body as one JS expression, so the
  // embedded {{ }} arrive as literal text and the runId never matches.
  const w = validWorkflow();
  const report = (w.nodes as Record<string, unknown>[]).find(
    (n) => n.name === "ReportBack",
  ) as Record<string, unknown>;
  (report.parameters as Record<string, unknown>).jsonBody =
    '={"runId": "{{ $(\'Trigger\').item.json.body.runId }}", "status": "success"}';
  const result = validateWorkflowJson(w, CALLBACK);
  expect(result.ok).toBe(false);
  expect(result.errors.some((e) => e.includes("jsonBody"))).toBe(true);
});

test("validateWorkflowJson rejects Set nodes with no assignments", () => {
  const w = validWorkflow();
  const setNode = (w.nodes as Record<string, unknown>[]).find(
    (n) => n.name === "DoWork",
  ) as Record<string, unknown>;
  (setNode.parameters as Record<string, unknown>).assignments = {
    assignments: [],
  };
  const result = validateWorkflowJson(w, CALLBACK);
  expect(result.ok).toBe(false);
  expect(result.errors.some((e) => e.includes("DoWork"))).toBe(true);
});

test("validateWorkflowJson rejects error branches without onError continueErrorOutput", () => {
  const w = validWorkflow();
  (w.connections as Record<string, unknown>).DoWork = {
    main: [[{ node: "ReportBack", type: "main", index: 0 }]],
    error: [[{ node: "ReportBack", type: "main", index: 0 }]],
  };
  const withoutOnError = validateWorkflowJson(w, CALLBACK);
  expect(withoutOnError.ok).toBe(false);
  expect(withoutOnError.errors.some((e) => e.includes("onError"))).toBe(true);

  const w2 = validWorkflow();
  (w2.connections as Record<string, unknown>).DoWork = {
    main: [[{ node: "ReportBack", type: "main", index: 0 }]],
    error: [[{ node: "ReportBack", type: "main", index: 0 }]],
  };
  const doWork = (w2.nodes as Record<string, unknown>[]).find(
    (n) => n.name === "DoWork",
  ) as Record<string, unknown>;
  doWork.onError = "continueErrorOutput";
  expect(validateWorkflowJson(w2, CALLBACK).ok).toBe(true);
});
