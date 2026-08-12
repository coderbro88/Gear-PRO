// Expo Router API route — GET /health
//
// Uptime probe for the #hevel-health monitor (github-org-repo's
// scripts/discord_health_notify.py curls every active app's health_url on a
// 4-hour cron). GearPro is a live paying product and had no health_url at all,
// so nothing paged if it went down.
//
// Why a route and not the landing page: the workspace rule is that a health_url
// must return 200 JSON and must NEVER be HTML — Cloudflare intermittently
// bot-challenges a plain `curl` on HTML with a 403, which fires false "DOWN"
// alerts (that is what hit hevel-landing on 2026-06-19/20). It also matters here
// specifically because `/` serves the Expo SPA shell, which returns 200 whether
// or not the app actually boots — a useless signal.
//
// This works because app.json sets `web.output: "server"`; API routes do not
// exist under a static export. If that ever changes back to "static", this route
// silently stops existing and the probe starts reporting DOWN.
//
// Deliberately dependency-free and does no I/O — no Supabase, no Stripe. It
// answers "is the server export serving?" and nothing else. A probe that can
// fail for reasons unrelated to the app being up stops being an uptime signal
// and starts paging on its own dependencies.

export function GET() {
  return Response.json(
    { ok: true, app: "gearpro" },
    {
      headers: {
        // Never cache: a cached 200 would keep reporting healthy after the
        // deployment stopped serving, which is the one thing a probe must not do.
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
