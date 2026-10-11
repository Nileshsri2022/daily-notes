import { expect, test } from "@playwright/test";
import {
  buildSpecPrompt,
  compileSpecToN8n,
  validateWorkflowSpec,
  type WorkflowSpec,
} from "../src/lib/workflow-spec";
import { validateWorkflowJson } from "../src/lib/n8n";

const { describe } = test;

const CALLBACK = "https://example.convex.site/n8n-callback";

function datetimeSpec(): WorkflowSpec {
  return {
    name: "Dincharya: Current date and time",
    steps: [
      {
        type: "set",
        name: "GetDateTime",
        assignments: [
          { name: "now", value: { expression: "new Date().toISOString()" } },
        ],
      },
    ],
    summary: { expression: "$json.now" },
  };
}

function fullSpec(): WorkflowSpec {
  return {
    name: "Dincharya: Branching fetch",
    steps: [
      {
        type: "set",
        name: "Prepare",
        assignments: [
          { name: "greeting", value: { literal: "hello" } },
          { name: "count", value: { expression: "$json.items.length" } },
        ],
      },
      { type: "if", name: "CheckCount", condition: "$json.count > 5" },
      {
        type: "http",
        name: "FetchData",
        method: "GET",
        url: "https://api.example.com/data",
      },
      {
        type: "code",
        name: "Transform",
        code: "return [{ json: { doubled: $input.all()[0].json.count * 2 } }];",
      },
    ],
    summary: { literal: "done" },
  };
}

describe("validateWorkflowSpec", () => {
  test("accepts a valid spec", () => {
    const r = validateWorkflowSpec(datetimeSpec());
    expect(r.ok).toBe(true);
    expect(r.spec).toBeDefined();
  });

  test("rejects unknown step types", () => {
    const r = validateWorkflowSpec({
      name: "x",
      steps: [{ type: "teleport", name: "Nope" }],
      summary: { literal: "done" },
    });
    expect(r.ok).toBe(false);
  });

  test("rejects duplicate step names", () => {
    const s = datetimeSpec();
    s.steps.push({
      type: "set",
      name: "GetDateTime",
      assignments: [{ name: "x", value: { literal: "y" } }],
    });
    const r = validateWorkflowSpec(s);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("duplicate step name"))).toBe(true);
  });

  test("rejects set steps with no assignments", () => {
    const r = validateWorkflowSpec({
      name: "x",
      steps: [{ type: "set", name: "Empty", assignments: [] }],
      summary: { literal: "done" },
    });
    expect(r.ok).toBe(false);
  });

  test("rejects values with both literal and expression", () => {
    const r = validateWorkflowSpec({
      name: "x",
      steps: [
        {
          type: "set",
          name: "Bad",
          assignments: [
            { name: "v", value: { literal: "a", expression: "b" } },
          ],
        },
      ],
      summary: { literal: "done" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("exactly one"))).toBe(true);
  });

  test("rejects non-https http step urls", () => {
    const r = validateWorkflowSpec({
      name: "x",
      steps: [
        { type: "http", name: "Fetch", method: "GET", url: "http://x.com" },
      ],
      summary: { literal: "done" },
    });
    expect(r.ok).toBe(false);
  });

  test("rejects empty steps", () => {
    const r = validateWorkflowSpec({
      name: "x",
      steps: [],
      summary: { literal: "done" },
    });
    expect(r.ok).toBe(false);
  });
});

describe("compileSpecToN8n", () => {
  test("compiled output always passes workflow validation (core invariant)", () => {
    for (const spec of [datetimeSpec(), fullSpec()]) {
      const compiled = compileSpecToN8n(spec, {
        callbackUrl: CALLBACK,
        webhookPath: "dincharya-webhook",
      });
      const check = validateWorkflowJson(compiled, CALLBACK);
      expect(check.errors).toEqual([]);
      expect(check.ok).toBe(true);
    }
  });

  test("webhook trigger is first with the given path", () => {
    const compiled = compileSpecToN8n(datetimeSpec(), {
      callbackUrl: CALLBACK,
      webhookPath: "dincharya-abc123",
    });
    const trigger = compiled.nodes[0];
    expect(trigger.name).toBe("Trigger");
    expect(trigger.type).toBe("n8n-nodes-base.webhook");
    expect(
      (trigger.parameters as Record<string, unknown>).path,
    ).toBe("dincharya-abc123");
  });

  test("callback nodes use plain-JSON jsonBody with correct runId (no =-prefix)", () => {
    const compiled = compileSpecToN8n(datetimeSpec(), {
      callbackUrl: CALLBACK,
      webhookPath: "dincharya-webhook",
    });
    const report = compiled.nodes.find((n) => n.name === "ReportBack")!;
    const params = report.parameters as Record<string, unknown>;
    expect(params.url).toBe(CALLBACK);
    const body = params.jsonBody as string;
    expect(body.startsWith("=")).toBe(false);
    expect(body).toContain("$('Trigger').item.json.body.runId");
    expect(body).toContain('"status": "success"');
    // The spec's expression summary is wrapped by the compiler, not the model.
    expect(body).toContain('"summary": "={{$json.now}}"');
  });

  test("error callback posts failed status with the error message", () => {
    const compiled = compileSpecToN8n(datetimeSpec(), {
      callbackUrl: CALLBACK,
      webhookPath: "dincharya-webhook",
    });
    const err = compiled.nodes.find((n) => n.name === "ErrorReport")!;
    const body = (err.parameters as Record<string, unknown>).jsonBody as string;
    expect(body).toContain('"status": "failed"');
    expect(body).toContain("{{ $json.error.message }}");
  });

  test("every non-callback node has onError and a live error branch", () => {
    const compiled = compileSpecToN8n(fullSpec(), {
      callbackUrl: CALLBACK,
      webhookPath: "dincharya-webhook",
    });
    const conns = compiled.connections as Record<
      string,
      Record<string, { node: string }[][]>
    >;
    for (const node of compiled.nodes) {
      if (node.name === "ErrorReport") continue;
      expect(node.onError).toBe("continueErrorOutput");
      const errBranch = conns[node.name]?.error?.[0]?.[0]?.node;
      expect(errBranch).toBe("ErrorReport");
    }
  });

  test("set assignments become {{ }}-wrapped expressions; literals stay plain", () => {
    const compiled = compileSpecToN8n(fullSpec(), {
      callbackUrl: CALLBACK,
      webhookPath: "dincharya-webhook",
    });
    const set = compiled.nodes.find((n) => n.name === "Prepare")!;
    const assignments = (
      (set.parameters as Record<string, unknown>).assignments as Record<
        string,
        unknown
      >
    ).assignments as Array<{ name: string; value: string }>;
    expect(assignments).toHaveLength(2);
    expect(assignments[0]).toMatchObject({ name: "greeting", value: "hello" });
    expect(assignments[1].value).toBe("={{$json.items.length}}");
  });

  test("if node wires true and false outputs to the next step", () => {
    const compiled = compileSpecToN8n(fullSpec(), {
      callbackUrl: CALLBACK,
      webhookPath: "dincharya-webhook",
    });
    const conns = compiled.connections as Record<
      string,
      Record<string, { node: string }[][]>
    >;
    const mains = conns["CheckCount"].main;
    expect(mains).toHaveLength(2); // true + false outputs
    expect(mains[0][0].node).toBe("FetchData");
    expect(mains[1][0].node).toBe("FetchData");
    const ifNode = compiled.nodes.find((n) => n.name === "CheckCount")!;
    const cond = (
      (ifNode.parameters as Record<string, unknown>).conditions as Record<
        string,
        unknown
      >
    ).conditions as Array<{ leftValue: string }>;
    expect(cond[0].leftValue).toBe("={{$json.count > 5}}");
  });

  test("linear chain: trigger → steps → ReportBack", () => {
    const compiled = compileSpecToN8n(datetimeSpec(), {
      callbackUrl: CALLBACK,
      webhookPath: "dincharya-webhook",
    });
    const conns = compiled.connections as Record<
      string,
      Record<string, { node: string }[][]>
    >;
    expect(conns["Trigger"].main[0][0].node).toBe("GetDateTime");
    expect(conns["GetDateTime"].main[0][0].node).toBe("ReportBack");
  });

  test("ReportBack node has no outgoing main connections (no dangling target)", () => {
    const compiled = compileSpecToN8n(datetimeSpec(), {
      callbackUrl: CALLBACK,
      webhookPath: "dincharya-webhook",
    });
    const conns = compiled.connections as Record<
      string,
      Record<string, { node: string }[][]>
    >;
    expect(conns["ReportBack"]?.main).toBeUndefined();
  });
});

describe("buildSpecPrompt", () => {
  test("teaches the spec format, not n8n JSON", () => {
    const { system, user } = buildSpecPrompt("make a date workflow");
    expect(user).toContain("make a date workflow");
    // The prompt must not contain n8n JSON syntax the model could copy wrongly.
    expect(system).not.toContain("typeVersion");
    expect(system).not.toContain("jsonBody");
    expect(system).toContain("{{ }}");
  });
});
