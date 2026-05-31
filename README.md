# chsh studio — landing

AI-automation landing page for **chsh studio** (Kazakhstan). React + Vite + Tailwind, with a Vercel serverless function that proxies form submissions to Telegram.

## Stack

- React 19 + TypeScript + Vite
- Tailwind (custom Oswald + Inter typography, blue accent `#3B82F6`)
- UnicornStudio React (WebGL hero + footer scenes)
- Vercel serverless function (`api/lead.ts`) → Telegram Bot API

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
npm run lint
```

The form posts to `/api/lead`. In local dev (Vite-only), this endpoint does NOT exist — submissions will fail with a network error. To test the full flow locally, run via Vercel CLI:

```bash
npm i -g vercel
vercel dev           # serves both Vite frontend and api/lead.ts
```

## Production deploy (Vercel)

1. Push this directory (or the parent monorepo) to GitHub.
2. https://vercel.com/new → Import the repo.
3. **If the landing lives in a subfolder** (e.g. `chsh-landing/`), set Project Settings → **Root Directory** = `chsh-landing`.
4. Framework: Vite (auto-detected). Build command: `npm run build`. Output: `dist`.
5. Add **Environment Variables** (Project Settings → Environment Variables):
   - `TG_BOT_TOKEN` = the bot token from @BotFather (required for `/api/lead` and `/api/tg-webhook`)
   - `TG_CHAT_ID` = the destination chat id (e.g. `-1003773180003` for a private channel — bot must be admin with Post Messages permission)
   - `ALLOW_ORIGIN` (optional) = explicit CORS origin if you serve the site from a different domain than the API
   - `CALENDLY_URL` (optional, for `/api/tg-webhook`) — public Calendly link for the discovery bot CTA
   - `WA_NUMBER` (optional, for `/api/tg-webhook`) — fallback WhatsApp number, defaults to `77757767666`
   - `TG_WEBHOOK_SECRET` (optional, recommended) — random string sent in the `X-Telegram-Bot-Api-Secret-Token` header by Telegram; rejects spoofed requests
   - Public (browser) — all optional, all `VITE_*`: `VITE_YM_ID`, `VITE_CLARITY_ID`, `VITE_META_PIXEL_ID`, `VITE_TIKTOK_PIXEL_ID`. See `src/analytics.ts` and `.env.example`.
6. Deploy. Subsequent `git push` triggers automatic redeploy.
7. Add a custom domain (e.g. `chsh.online`) in Project Settings → Domains; SSL provisioned automatically. After the domain is live, also update `index.html` canonical/OG, `public/robots.txt` and `public/sitemap.xml` if you ever change domains again — they currently point at `chsh.online`.

## Form → Telegram flow

```
Browser form → POST /api/lead (same origin)
            → api/lead.ts (Vercel Node runtime)
            → POST https://api.telegram.org/bot${TOKEN}/sendMessage
            → Telegram channel
```

Token + chat id are **never** sent to the browser. The serverless function validates the payload, escapes Markdown, caps field lengths, and returns 200/4xx/5xx.

## AI lead-qualification bot

`api/tg-webhook.ts` is the Telegram webhook for the **AI** qualification bot. The landing form (`/api/lead`) stores the lead in Supabase and returns a `token`; the success screen shows a **«Продолжить в Telegram»** button linking to `t.me/<bot>?start=<token>`. When the user starts the bot, an LLM agent (`lib/agent.ts`, any OpenAI-compatible endpoint) greets them already knowing the form data and runs a natural **N-A-T-B** discovery (need → authority → timing → budget), updating a structured brief via tool-calling. Conversation state lives in Supabase (`conversations` table).

When the lead is qualified (or asks for a human / a price), the agent hands off:
1. posts a structured brief + lead temperature to `TG_CHAT_ID` (same channel `/api/lead` uses), and
2. replies to the user with a booking CTA — Calendly link if `CALENDLY_URL` is set, otherwise a WhatsApp deep-link.

If `ANTHROPIC_API_KEY` or Supabase env is missing, the bot **degrades gracefully** to a static greeting + booking CTA (it never crashes).

### Setup

1. Run `supabase/schema.sql` once in your Supabase project (SQL Editor).
2. Add to Vercel Environment Variables:
   - `LLM_API_KEY` — powers the agent (without it → static fallback). OpenAI-compatible.
   - `LLM_BASE_URL` (optional) — default `https://api.openai.com/v1`; set to your OmniRoute/gateway URL later
   - `LLM_MODEL` (optional) — default `gpt-4o-mini`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — server-only, for leads + state
   - `VITE_TG_BOT_USERNAME` — bot username (no `@`) for the form deep-link
   - `TG_BOT_TOKEN`, `TG_CHAT_ID` — already there from `/api/lead`
   - `CALENDLY_URL`, `WA_NUMBER`, `TG_WEBHOOK_SECRET` (optional, as before)
3. Deploy, then register the webhook (next section).

### Register the webhook

After deploying, tell Telegram where to send updates:
```bash
TOKEN="<your TG_BOT_TOKEN>"
SECRET="<your TG_WEBHOOK_SECRET, optional>"
curl -sS -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -H 'Content-Type: application/json' \
  -d "{
    \"url\": \"https://<your-vercel-domain>/api/tg-webhook\",
    \"secret_token\": \"${SECRET}\",
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }"
```
Verify: open `https://t.me/<your_bot_username>` → tap **Start**. The bot should greet you and ask the first question.

To remove the webhook:
```bash
curl "https://api.telegram.org/bot${TOKEN}/deleteWebhook"
```

## Project layout

```
api/
  lead.ts             # serverless function: form → Supabase (token) + Telegram
  tg-webhook.ts       # serverless function: AI qualification bot webhook
lib/                  # shared server code (bundled into functions, not deployed alone)
  agent.ts            # Claude SDR agent (N-A-T-B, brief via tool-calling)
  supabase.ts         # leads + conversation state
  telegram.ts         # Telegram Bot API helpers
supabase/
  schema.sql          # leads + conversations tables (run once)
public/
  logo.png            # brand logo (used in nav, footer, favicon)
  og-image.png        # 1200×630 social-share image
  robots.txt
  sitemap.xml
src/
  App.tsx             # single-page landing component
  index.css           # design tokens + animations + scenes
  main.tsx
index.html            # SEO meta, OG, Twitter Card, JSON-LD
vercel.json           # Vercel build / function config
```

## Replacing brand assets

- `public/logo.png` — primary logo (also used as favicon).
- `public/og-image.png` — 1200×630 social preview. Regenerate after meaningful brand changes.
- `src/App.tsx` — `WA_NUMBER`, `TG_USERNAME`, `EMAIL`, `PORTFOLIO_LINK` constants at top.
