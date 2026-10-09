# Incident Report: Clerk Production Authentication Failure on Vercel & Mobile

**Date:** October 9, 2026  
**Project:** Dincharya (`daily-notes`)  
**Production URL:** `https://daily-notes-ruddy.vercel.app`  
**Mobile Package:** `com.nilesh.dincharya`  
**Status:** Resolved (Workaround Active: Clerk Test Key connected to Production Convex Backend)

---

## 1. Executive Summary

When deploying Dincharya to Vercel and preparing the standalone Android APK, the production Clerk publishable key (`pk_live_Y2xlcmsuZGFpbHktbm90ZXMtcnVkZHkudmVyY2VsLmFwcCQ`) was configured. Immediately afterward:
* The web sign-in page at `https://daily-notes-ruddy.vercel.app/sign-in` failed to load Clerk components.
* Network requests to Clerk failed with `net::ERR_CONNECTION_CLOSED` and SSL handshake termination.
* Sign-in and authentication functionality broke across both the Vercel web deployment and the Android APK.

This report documents the architectural root cause, technical evidence, immediate fix applied, and the step-by-step roadmap to enable `pk_live` with a custom domain in the future.

---

## 2. Root Cause Analysis (Deep Dive)

### 2.1 How Clerk Production Keys (`pk_live`) Work
Unlike development instances (`pk_test_...`) which are hosted entirely on Clerk's shared infrastructure (`*.clerk.accounts.dev`), a Clerk **Production instance** isolates your application by requiring a dedicated **Frontend API (FAPI)** domain.

When configuring the production instance with domain `daily-notes-ruddy.vercel.app`, Clerk decoded and generated:
* Key: `pk_live_Y2xlcmsuZGFpbHktbm90ZXMtcnVkZHkudmVyY2VsLmFwcCQ`
* Base64 Decoded Frontend API Endpoint: `https://clerk.daily-notes-ruddy.vercel.app`

### 2.2 The Fundamental Incompatibility with `*.vercel.app`
To serve requests under `clerk.daily-notes-ruddy.vercel.app`:
1. Clerk requires you to create a **DNS CNAME record** in your domain registrar/DNS provider pointing `clerk.<your-domain>` to Clerk’s edge servers (`frontend-api.clerk.services`).
2. Clerk uses this DNS record to generate and auto-renew an SSL/TLS certificate via Cloudflare/Let's Encrypt.
3. **The Core Block:** `daily-notes-ruddy.vercel.app` is a free subdomain on the `vercel.app` public domain. Because Vercel controls the DNS zone for `vercel.app`, **end users cannot add DNS CNAME records to `*.vercel.app`**.
4. Consequently:
   * No DNS record pointed `clerk.daily-notes-ruddy.vercel.app` to Clerk.
   * No SSL certificate was ever issued for `clerk.daily-notes-ruddy.vercel.app`.
   * Any client (web browser or Android app) attempting to connect experienced immediate TCP reset / TLS handshake termination:
     ```
     curl: (35) schannel: failed to receive handshake, SSL/TLS connection failed
     net::ERR_CONNECTION_CLOSED
     ```

### 2.3 Why the Clerk Proxy (`/__clerk`) Did Not Work
Clerk provides an alternative called **Frontend API Proxying** (`/__clerk`), where the web server forwards requests to `frontend-api.clerk.services`. However, this was unavailable for two architectural reasons:
1. **Static SPA vs Server-Side Middleware:** Dincharya is an Expo / React Native Single Page Application exported with `output: "single"`. It is served as static HTML/JS files on Vercel without a Next.js / Node.js middleware server. Any request to `/__clerk` simply served the static `index.html`.
2. **Native Mobile App Isolation:** The Android APK runs natively on physical smartphones. A native mobile client cannot rely on a static web rewrite to handle native OAuth handshakes and token exchanges.

---

## 3. Diagnostic Evidence

### Network Trace from Production Website
Inspection of `https://daily-notes-ruddy.vercel.app/sign-in` captured the following failures:

| Request ID | Method | Target URL | HTTP Status |
| :--- | :--- | :--- | :--- |
| `reqid=1` | GET | `https://daily-notes-ruddy.vercel.app/sign-in` | `200 OK` |
| `reqid=3` | GET | `https://daily-notes-ruddy.vercel.app/_expo/static/js/web/entry-*.js` | `200 OK` |
| **`reqid=5`** | **GET** | **`https://clerk.daily-notes-ruddy.vercel.app/npm/@clerk/clerk-js@5/dist/clerk.browser.js`** | **`net::ERR_CONNECTION_CLOSED`** |
| **`reqid=8`** | **GET** | **`https://clerk.daily-notes-ruddy.vercel.app/npm/@clerk/clerk-js@5/dist/clerk.browser.js`** | **`net::ERR_CONNECTION_CLOSED`** |

### Endpoint Health Comparison
```bash
# Production Domain (Failed - No SSL / No CNAME)
curl -I https://clerk.daily-notes-ruddy.vercel.app
# Result: (35) schannel: failed to receive handshake, SSL/TLS connection failed

# Clerk Development Domain (Success - Valid SSL)
curl -I https://helped-beagle-7756.clerk.accounts.dev
# Result: HTTP/1.1 307 Temporary Redirect (Cloudflare SSL Active)
```

---

## 4. Resolution Applied

### Phase 1: Switched Clerk Key to Shared Instance
We updated `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` across both platforms to the active Clerk key:
```
pk_test_aGVscGVkLWJlYWdsZS03NzU2LmNsZXJrLmFjY291bnRzLmRldiQ
```
* **In Vercel:** Updated project `daily-notes` environment variable for `Production` (`visibility: config`).
* **In EAS (`eas.json`):** Updated `build.production.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.

### Phase 2: Verified Convex Backend Compatibility
In `convex/auth.config.ts`, providers were configured to accept tokens from both the development domain and future production domain:
```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_DOMAIN || "https://helped-beagle-7756.clerk.accounts.dev",
      applicationID: "convex",
    },
    {
      domain: "https://clerk.daily-notes-ruddy.vercel.app",
      applicationID: "convex",
    },
  ],
};
```
This guarantees that **user notes and data continue to flow directly into the production Convex database** (`https://giddy-coyote-544.convex.cloud`).

### Phase 3: Live Verification
After redeployment, Chrome DevTools verification confirmed:
* `clerk.browser.js` returned `HTTP 200`.
* `dev_browser`, `environment`, and `client` endpoints returned `HTTP 200`.
* The Sign-In form rendered completely and without console errors.

---

## 5. Permanent Roadmap: Migrating to `pk_live` with a Custom Domain

When you are ready to remove the development banner and use a full production `pk_live` key, follow these exact steps:

### Step 1: Acquire a Custom Domain
Buy any custom domain (e.g. `dincharya.in` or `dincharya.com`) from **Cloudflare Registrar**, **Namecheap**, or **GoDaddy**.

### Step 2: Connect Domain in Vercel
1. Go to **Vercel Dashboard > Project Settings > Domains**.
2. Add your custom domain (e.g. `dincharya.in` and `www.dincharya.in`).
3. Add the DNS records Vercel requests (CNAME `cname.vercel-dns.com` or A record `76.76.21.21`).

### Step 3: Configure Clerk Production Domain
1. In the **Clerk Dashboard**, switch to your **Production instance**.
2. Navigate to **Configure > Domains**.
3. Set your production domain to `dincharya.in`.
4. Clerk will generate 3–4 DNS CNAME records (e.g., `clerk.dincharya.in`, `accounts.dincharya.in`).

### Step 4: Add Clerk DNS Records in Cloudflare
1. In Cloudflare DNS, add each CNAME record provided by Clerk.
2. **Crucial:** Set Proxy status to **DNS Only (Grey Cloud)** for Clerk's CNAME records so Clerk can verify and issue the SSL certificate.
3. Wait 2–5 minutes for Clerk to display **"Verified"**.

### Step 5: Update App Keys
1. Copy the new `pk_live_...` key from Clerk Dashboard.
2. Update **Vercel Environment Variables** with the new `pk_live` key.
3. Update `build.production.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `eas.json`.
4. Run `git push origin main` and tag the release (`git tag v1.0.X && git push origin v1.0.X`).
