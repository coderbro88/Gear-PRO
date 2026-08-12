# GearPro — Agent Rules

> Banner: the workspace **`HEVEL/CLAUDE.md` is authoritative**. If anything here conflicts with
> it, `HEVEL/CLAUDE.md` wins. Read it before any infra/DB/deploy work.

**GearPro** is a Hevel Group **product** (not client work) — a personal SaaS app, Expo Router
(React Native + web). $10/mo or $50/yr subscription via Stripe, 7-day trial, live shared-trip
realtime sync as the paid feature.

## ⚠️ This code is NOT inside the HEVEL workspace

The actual source lives at
`~/Library/Mobile Documents/com~apple~CloudDocs/CODING/PERSONAL/GearPro2/gearpro` (iCloud Drive) —
reached from HEVEL only via the `.gearpro-src` symlink (this file's real location) and a separate
`.gearpro-preview` copy. **`find`/`grep` over the HEVEL workspace root does not see this code** —
symlinks aren't followed by default. This is the highest-blast-radius agent-guidance gap found in
the 2026-08-06 governance audit: **this app carries a live Stripe secret key** and had zero
app-specific guidance until this file. If you're auditing the workspace for what exists, remember
this app is invisible to a plain directory walk.

## This app's identity

- **GitHub:** `HEVEL-GROUP/Gear-PRO`
- **Railway:** service `gearpro` (`6803500e-ac4b-4e42-aa1d-e09a8ff9511f`) inside
  `hevel-development` (`71c1c777-6159-4b9d-b79b-e6c5b525c1af`), environment `production`
  (`51c5c444-c7d9-4587-ae99-50e9c4da741a`) — an isolated service within that shared env, doesn't
  touch portal/crm/quick-prospect/thetabeta/petramax/reserves which also live there.
- **Supabase:** dedicated project, ref `gkkrejplofglwrbbnxit`. No static service-role key is
  stored anywhere (`supabase_secret_env: null` in the registry) — pull a fresh one live from the
  Management API's `/api-keys` endpoint via the Supabase MCP + `SUPABASE_ACCESS_TOKEN` when
  needed, rather than expecting one in Doppler.
- **Prod URL:** `https://gearpro.app`
- **DNS:** Cloudflare zone `60480e8056118e85311c1a514f98516f` — **on Austin's personal Cloudflare
  account, not the `hevel-automation` account** — but the workspace `CLOUDFLARE_API_TOKEN` still
  reaches it, confirmed live 2026-08. Same "never touch DNS without Austin saying 'update DNS'"
  rule applies regardless of which account it's in.
- **Payments:** **live Stripe keys** — `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` live as Deno
  env vars on the **Supabase Edge Functions** (`supabase secrets set … --project-ref
  gkkrejplofglwrbbnxit`), not in this repo's own `.env`. Stripe isn't a client npm dependency —
  it's implemented entirely server-side in `supabase/functions/{stripe-webhook,stripe-donate,
  delete-account}/`. A real `cs_live_` checkout session was verified end-to-end 2026-08 then
  expired/cleaned up — treat this as a real payment surface, not a sandbox.

## Deploy — CLI upload ONLY, GitHub source is deliberately disconnected

```bash
cd .gearpro-src   # or wherever you've cd'd via the real iCloud path
railway up        # self-linked to the gearpro service; uploads the working tree directly
```

There is **no `deploy.sh`/`deploy-dev.sh`/`deploy-prod.sh`** here — just a bare `railway up` from
this directory (which the workspace's `guard.sh` normally blocks unqualified... note that
`guard.sh` lives in the HEVEL workspace's `.claude/hooks/`, and since this directory is reached
via a symlink *outside* that workspace, **guard.sh's hook may not be active here at all** —
double-check `railway status` shows `gearpro`/`production` before running `up`, since the usual
mechanical safety net may not apply).

**A GitHub-integration auto-deploy was connected at some point and was deliberately
DISCONNECTED 2026-07-24** (`serviceDisconnect`) — its `rootDirectory` expectation conflicts with
CLI-upload's: a repo-clone deploy needs `rootDirectory='gearpro'`, but a CLI upload run from
*inside* the `gearpro/` folder needs `rootDirectory=''`. **Do not reconnect a GitHub source for
this service** without resolving that conflict first, or deploys will silently break.

Build/runtime (`railway.json`): Nixpacks, `npx expo export -p web` → `npx expo serve --port
"$PORT"`. Requires `"engines": {"node": "22.x"}` in `package.json` — Nixpacks' default
`nodejs_20` resolves to 20.18.1, too old for `@supabase/realtime-js`'s native-WebSocket
requirement (needs ≥20.19.4). Don't remove that engines pin.

## Architecture notes

- `app.json`'s `web.output` is `"server"` (not `"single"`) — required for the Nixpacks
  export/serve pattern above; changing it back to a static single-page export breaks the Railway
  deploy.
- Realtime (shared-trip sync, the paid feature) is in `src/lib/sync/useCloudSync.ts` via
  `@supabase/supabase-js` channels — needs an explicit `wss://` allowance; the CSP is injected
  post-export by `scripts/inject-security-headers.js`, not set in `app.json`.
- Client env: only `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` — anything
  `EXPO_PUBLIC_*` is inlined into the client bundle at build time, so never put a service-role or
  Stripe secret key behind that prefix.

## Before touching anything here

Read `docs/expo` at the pinned version — **Expo has changed substantially**; this app pins
`expo ~57.0.4` and training data is unreliable for Expo Router v57+. Check
`https://docs.expo.dev/versions/v57.0.0/` for exact APIs before writing any Expo/React Native
code here.
