// Server-side n8n REST API client.
//
// IMPORTANT: this module exports plain functions only (no Convex function
// wrappers), so nothing here is reachable from client code. N8N_HOST and
// N8N_API_KEY live in Convex environment variables and never leave the server.

export class N8nError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "N8nError";
    this.status = status;
  }
}

function getConfig(): { host: string; apiKey: string } {
  const host = (process.env.N8N_HOST || "").replace(/\/+$/, "");
  const apiKey = process.env.N8N_API_KEY || "";
  if (!host || !apiKey) {
    throw new N8nError(
      "n8n is not configured. Set N8N_HOST and N8N_API_KEY in the Convex dashboard (Settings → Environment Variables). See N8N_SETUP.md.",
    );
  }
  return { host, apiKey };
}

/** Public n8n host URL (for building editor links and webhook URLs). */
export function n8nHost(): string {
  return getConfig().host;
}

async function n8nFetch(path: string, init: RequestInit = {}): Promise<any> {
  const { host, apiKey } = getConfig();
  let res: Response;
  try {
    res = await fetch(`${host}/api/v1${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": apiKey,
        // The user's n8n sits behind bot protection that blocks non-browser
        // User-Agents (403 "error code: 1010" on API calls otherwise).
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        ...(init.headers || {}),
      },
    });
  } catch (e) {
    throw new N8nError(
      `Could not reach n8n at ${host}. Is it running and publicly reachable? (${
        e instanceof Error ? e.message : String(e)
      })`,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new N8nError(
      `n8n API error ${res.status}: ${text.slice(0, 300) || res.statusText}`,
      res.status,
    );
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Create a workflow in n8n. Returns the n8n workflow id. */
export async function createWorkflowOnN8n(
  workflowJson: Record<string, unknown>,
): Promise<{ id: string }> {
  const data = await n8nFetch("/workflows", {
    method: "POST",
    body: JSON.stringify(workflowJson),
  });
  if (!data || typeof data.id !== "string" || !data.id) {
    throw new N8nError("n8n did not return a workflow id for the created workflow.");
  }
  return { id: data.id };
}

/** Activate a workflow so its production webhook URL responds. */
export async function activateWorkflowOnN8n(id: string): Promise<void> {
  await n8nFetch(`/workflows/${encodeURIComponent(id)}/activate`, {
    method: "POST",
  });
}

/**
 * Trigger a workflow via its production webhook URL.
 * Throws N8nError when unreachable or when n8n rejects the call
 * (most commonly: the workflow is not active).
 */
export async function triggerWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Same bot-protection bypass as n8nFetch: the n8n host blocks
        // non-browser User-Agents on webhook triggers too.
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new N8nError(
      `Could not trigger n8n webhook: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new N8nError(
      `n8n webhook trigger failed (${res.status}). Is the workflow active? ${text.slice(0, 200)}`,
      res.status,
    );
  }
}
