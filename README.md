# DiaryNotes

A minimal Medium-style notes/diary app. One TypeScript codebase (Expo / React Native) that runs on **Android, iOS, and web**.

- **UI**: plain React Native components, no UI kit
- **Auth**: [Clerk](https://clerk.com) (email + password)
- **Data**: [Convex](https://convex.dev) (serverless database + backend functions)

## Project layout

```
src/app/          Screens (expo-router)
  _layout.tsx     Clerk + Convex providers, route guards
  index.tsx       Home feed of your notes
  editor.tsx      Create / edit a note
  note/[id].tsx   Read view (edit / publish / delete)
  sign-in.tsx     Email + password sign in / sign up
convex/
  schema.ts       notes table
  notes.ts        list / get / create / update / setStatus / remove
  auth.config.ts  Clerk <-> Convex auth integration
.env.local        Your Clerk + Convex keys (git-ignored)
```

## One-time setup

### 1. Clerk (auth)

1. Create a free account at [dashboard.clerk.com](https://dashboard.clerk.com) and create an application (enable **Email address** + **Password**).
2. Copy the **Publishable key** (API Keys page) and paste it into `.env.local`:
   `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
3. Activate the Convex integration: in the Clerk dashboard go to **Integrations** → **Convex** → **Activate**. This creates a JWT template named `convex` whose claims are pre-mapped and **read-only** — there is nothing to edit or save. (If your dashboard has no Integrations section, use **JWT Templates → New template → Convex** instead.) You're done as soon as a template named `convex` appears in the JWT Templates list.

### 2. Convex (database + backend)

```bash
npx convex dev
```

- Log in (creates a free account if needed), create a new project.
- This command regenerates `convex/_generated/` (the real version of the checked-in stubs) and writes `EXPO_PUBLIC_CONVEX_URL` into `.env.local`.
- Then connect Clerk to Convex — copy your Clerk **issuer domain** (API Keys page, e.g. `https://your-app-33.clerk.accounts.dev`) and run:

```bash
npx convex env set CLERK_ISSUER_DOMAIN https://your-app-33.clerk.accounts.dev
```

Keep `npx convex dev` running while you develop (it syncs backend code).

### 3. Run the app

```bash
npm run web        # browser
npm run android    # Android emulator, or Expo Go on a phone
npm run ios        # macOS only
```

## Features

- Email + password auth with 2FA support (Clerk)
- Rich text editor (10Tap) with formatting toolbar; plain notes render as markdown
- Cover images via Convex file storage
- Tags with feed filter chips
- Pin notes (pinned notes sort first)
- Search across title, body, and tags
- Auto-save while editing existing notes
- Draft / published toggle
- Soft delete with Trash screen (restore or delete forever)
- Speech-to-text dictation (Web Speech API on web; on-device on native dev builds)
- Responsive web + Android + iOS from one codebase

## Deploying

> `EXPO_PUBLIC_*` variables are baked into the app at build time — set them in `.env.local` **before** exporting/building.

**1. Backend — switch Convex to production:**

```bash
npx convex deploy                                                  # creates + pushes to the prod deployment
npx convex env set --prod CLERK_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
```

Copy the production deployment URL it prints (looks like `https://<name>.convex.cloud`) and put it in `.env.local` as `EXPO_PUBLIC_CONVEX_URL`, replacing the dev URL. The dev deployment (`npx convex dev`) keeps working independently for development.

**2. Web — deploy to Vercel:**

The repo has a `vercel.json`, so no dashboard configuration is needed.

*Option A — auto-deploy from GitHub (recommended):* push the repo to GitHub, then on [vercel.com/new](https://vercel.com/new) import the repo. Before deploying, add the two Environment Variables in the project settings (production values): `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. Every future `git push` redeploys automatically.

*Option B — one-off from your machine:*

```bash
npm i -g vercel
vercel deploy dist --prod        # after running npx expo export --platform web
```

(Netlify and Cloudflare Pages work the same way — build `npx expo export --platform web`, publish the `dist` folder.)

**3. Android — build an installable package with EAS:**

```bash
npm i -g eas-cli
eas build -p android --profile preview     # .apk you can sideload / share
eas build -p android                        # .aab for the Play Store
```

(Requires a free Expo account; `eas build` runs in Expo's cloud.)

**Clerk note:** the free dev instance (`pk_test_...` key) is fine for testing deploys. Before a real Play Store launch, switch the Clerk app to production (`pk_live_...`, needs a custom domain) and use that key in the build.
