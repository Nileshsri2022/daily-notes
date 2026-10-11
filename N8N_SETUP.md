# n8n Setup for Dincharya Prompt-to-Workflow

This guide covers **M1**: getting a self-hosted n8n online so the app's
prompt-to-workflow integration (notes → generated n8n workflows → run tracking)
has something to talk to.

## 1. Run n8n with Docker

On any VPS with a public IP:

```bash
docker run -d \
  --name n8n \
  --restart unless-stopped \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

n8n is now at `http://<your-server-ip>:5678`. Don't stop here — it needs HTTPS
(see step 2) before the app can use it.

## 2. Put it behind HTTPS

The app (and Convex) must reach n8n over public HTTPS. Easiest options:

**Caddy** (automatic HTTPS):
```
n8n.meradomain.qzz.io {
    reverse_proxy 127.0.0.1:5678
}
```

**Or Cloudflare Tunnel** (no open ports at all):
```bash
cloudflared tunnel --url http://localhost:5678
```
Use the resulting `https://<name>.trycloudflare.com` as your host (fine for
testing; use a proper domain for anything real).

## 3. Create the API key

The app creates workflows via n8n's REST API using an API key — **not** your
n8n login. In the n8n UI:

1. Sign in with your n8n owner account.
2. Go to **Settings → API** (or your avatar → Settings → n8n API).
3. Create an API key and copy it. You won't see it again.

## 4. Reverse-proxy auth exemption (important)

If you protect n8n with basic auth at the proxy level, **exempt these paths**
or the app integration breaks:

- `/api/v1/*` — the REST API (authenticated separately via `X-N8N-API-KEY`)
- `/webhook/*` — workflow trigger URLs (public by design; secured by
  unguessable paths + the runId, not by login)

With Caddy, that looks like:

```
n8n.meradomain.qzz.io {
    handle /api/v1/* {
        reverse_proxy 127.0.0.1:5678
    }
    handle /webhook/* {
        reverse_proxy 127.0.0.1:5678
    }
    handle {
        basicauth {
            you <hashed-password>
        }
        reverse_proxy 127.0.0.1:5678
    }
}
```

The editor link the app shows you (`/workflow/<id>`) stays behind your normal
n8n sign-in — that's the human path and needs no exemption.

## 5. Set the Convex environment variables

In the **Convex dashboard → your deployment → Settings → Environment Variables**
(or `npx convex env set KEY value`):

| Variable | Value | Notes |
|---|---|---|
| `N8N_HOST` | `https://n8n.meradomain.qzz.io` | Set to exactly this URL (no trailing slash). |
| `N8N_API_KEY` | `<key from step 3>` | Server-side only, never in the app. |
| `N8N_CALLBACK_SECRET` | `<long random string>` | Shared secret; must match what the generated workflows send as `X-Callback-Secret`. Generate with `openssl rand -hex 32`. |
| `CONVEX_SITE_URL` | `https://<your-deployment>.convex.site` | Your deployment's HTTP-actions URL. The generated workflows POST completion callbacks to `<this>/n8n-callback`. Find it in the Convex dashboard under Settings → URL & Deploy Key. |
| `AI_API_KEY` | *(already set)* | The free model (`openai/gpt-oss-20b`) generates the workflow JSON. |

After setting variables, redeploy (`npx convex deploy` or push via `n8n convex dev`
for dev).

## 6. Smoke test

1. In the app, create an AI note saying **"create a workflow that sends me a
   reminder"**.
2. Open the note → you should see a ⚙️ Workflow card go from *Drafting…* to
   *Ready* (or *Failed* with the error text if something's misconfigured).
3. Tap **Open in n8n**, sign in, fill any credentials the workflow needs.
4. Tap **Run now** → the run appears in the card's history as *Running*, then
   *Success* once n8n's completion callback lands.

If the card stays on *Drafting…* or shows *Failed*, the error text names the
missing piece (usually one of the env vars above, or n8n not publicly
reachable).

## What works without a live n8n server

- Note saving is unaffected — workflow detection is fire-and-forget.
- Intent detection (the "create a workflow" regex) runs locally.
- If n8n is unreachable or unconfigured, the request lands in a clean *Failed*
  state with a clear message instead of crashing anything.

## Local n8n for development

Running n8n on `localhost:5678` is fine for building workflows by hand, but
Convex Cloud **cannot** reach your localhost — the create/trigger/callback
round-trip needs the public HTTPS host from step 2. For quick local
experiments, use the Cloudflare Tunnel URL as `N8N_HOST`.
