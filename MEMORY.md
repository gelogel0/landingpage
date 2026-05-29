# MEMORY.md

## Project
- Name: chsh-landing (chsh.online)
- Goal: One-page marketing site for **chsh studio** — AI-automation studio in
  Kazakhstan (WhatsApp bots, conversion landings, AI content, paid traffic).
  Captures inbound leads to Telegram via a Vercel serverless function.
- Current stage: Live in production on Vercel (`chsh.online`). Iterating on
  analytics / SEO / lead-magnet routes.

## Current Status
- What is already working:
  - React 19 + Vite SPA with 4 routes: `/` (App), `/checklist`, `/privacy`,
    `/offer`.
  - Lead form → `POST /api/lead` (Vercel function) → Telegram channel.
  - Discovery-call bot webhook at `/api/tg-webhook` (qualifying questions,
    stateless inline keyboards, posts to same TG channel).
  - SEO: per-route `<title>` / description / canonical / og:url, full
    JSON-LD graph (Organization + LocalBusiness + Service + WebSite) in
    `index.html`, hreflang `ru` / `kk`.
  - Brand assets: `public/logo.png`, `public/og-image.png` (1200×630).
  - Analytics layer (`src/analytics.ts`) supporting Yandex Metrika, Meta
    Pixel, TikTok Pixel and Microsoft Clarity. Env-driven (`VITE_*`); any
    tracker with a missing ID is silently skipped. Delegated click listener
    fires goals for WhatsApp / Telegram / phone (`tel:`) / email
    (`mailto:`) / portfolio links without per-anchor `onClick`.
- What was recently finished:
  - Meta Pixel integration aligned with the documented setup for
    `chsh.online` (Pixel id `2551432281920373`):
    PageView on every route (`/`, `/checklist`, `/privacy`, `/offer`),
    `Lead` on form submit with `content_name` / `content_category` /
    `value` / `currency`, `Contact` on WA / TG / `tel:` / `mailto:` clicks,
    `ViewContent` on `/checklist` mount + portfolio clicks,
    `CompleteRegistration` on checklist opt-in.
  - Footer year bumped to 2026, `studio@chsh.online` contact, new
    brand OG image, real `/privacy` and `/offer` legal pages.
- What is currently in progress:
  - Setting `VITE_META_PIXEL_ID=2551432281920373` in Vercel Project
    Settings → Environment Variables (manual step by owner; required to
    activate the Pixel in production).

## Decisions
- [2026-05] Analytics injection is centralised in `src/analytics.ts` rather
  than raw `<script>` tags in `index.html`. Reason: lets us env-gate each
  tracker, share a single goal-mapping table, and keep the bundle clean
  when an ID is missing.
- [2026-05] Pixel ID lives in Vercel env vars (`VITE_META_PIXEL_ID`), not
  hardcoded. Reason: matches the README convention used by every other
  tracker; same code can serve multiple environments / domains.
- [2026-05] `lead_submit` carries `content_name='AI Studio Audit Request'`,
  `content_category=<service label or 'AI Automation'>`, `value=0`,
  `currency='KZT'`. Reason: Meta needs `value`/`currency` for revenue-based
  optimisation; KZT matches the priced offers in `index.html` JSON-LD.

## Constraints
- Public Pixel IDs and Metrika counters are fine in the bundle; **never**
  put `TG_BOT_TOKEN`, `TG_CHAT_ID`, `TG_WEBHOOK_SECRET`, or any other
  server-only secret behind a `VITE_*` prefix.
- Telegram token + chat id stay server-side in `/api/lead` and
  `/api/tg-webhook` only.
- Vite-only `npm run dev` does **not** serve `/api/lead`; use `vercel dev`
  for the full flow locally.
- Node engine pinned to `22.x` (`package.json` → `engines.node`, `.nvmrc`).

## Open Issues
- Conversions API (CAPI) is intentionally deferred — JS pixel covers the
  ~60-70% of events that aren't blocked by ad-blockers / iOS 14+. CAPI
  would close the remaining 30-40% and is the next-best lever after the
  pixel is live.
- No automated tests yet; validation today is `npm run lint` + `npm run
  build` + manual Meta Pixel Helper / Events Manager test events.

## Next Steps
- 1. Owner: add `VITE_META_PIXEL_ID=2551432281920373` to Vercel
     (Project Settings → Environment Variables → Production + Preview),
     then redeploy (or push any commit) so the var is baked into the
     bundle.
- 2. Verify on `chsh.online` with the Meta Pixel Helper Chrome extension
     (green icon + Pixel id + PageView). Use Events Manager → Test Events
     to confirm `Lead`, `Contact`, `ViewContent`, `CompleteRegistration`.
- 3. After Pixel is verified live and collecting events, consider wiring
     Conversions API (CAPI) via Stape.io or directly from `/api/lead` to
     cover ad-blocker / iOS 14+ event loss.

## Last Session
- Date: 2026-05-15
- Summary: Aligned the existing analytics layer with the Meta Pixel
  install plan provided for `chsh.online` (Pixel `2551432281920373`):
  added `initAnalytics()` to `/privacy` and `/offer` so PageView fires on
  every route; added `tel:` and `mailto:` to the delegated click listener
  and mapped them to Meta `Contact`; enriched the `Lead` event with
  `content_name` / `content_category` / `value` / `currency`; fired
  `ViewContent` on `/checklist` mount. No new dependencies. Activation
  still requires `VITE_META_PIXEL_ID` in Vercel.
- Primary signal: `npm run lint` and `npm run build` both clean on the
  PR branch.
- Secondary signals: code paths reviewed against `src/analytics.ts`
  goal mapping; no `index.html` `<script>` duplication.
