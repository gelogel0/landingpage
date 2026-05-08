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

## Discovery-call qualification bot

`api/tg-webhook.ts` is the Telegram webhook for the discovery-call bot. After a user starts the bot (via `/start`, optionally with a payload like `/start checklist`), the bot asks 4 short qualifying questions (niche → budget → urgency → pain) using stateless inline keyboards — all state is encoded in `callback_data`, so no DB is needed.

When the user finishes, the bot:
1. posts a structured summary to `TG_CHAT_ID` (the same channel `/api/lead` uses), and
2. replies to the user with a CTA button — Calendly link if `CALENDLY_URL` is set, otherwise a WhatsApp deep-link.

### Setup

1. Add to Vercel Environment Variables:
   - `TG_BOT_TOKEN` (already there from `/api/lead`)
   - `TG_CHAT_ID` (already there)
   - `CALENDLY_URL` (optional) — your public booking link, e.g. `https://calendly.com/chsh-studio/audit-30min`
   - `WA_NUMBER` (optional) — fallback WhatsApp number; defaults to `77757767666`
   - `TG_WEBHOOK_SECRET` (optional but recommended) — random string; if set, only Telegram-signed requests are accepted
2. Deploy.
3. Tell Telegram where to send updates:
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
4. Verify: open `https://t.me/<your_bot_username>` → tap **Start**. The bot should greet and show the niche keyboard.

To remove the webhook:
```bash
curl "https://api.telegram.org/bot${TOKEN}/deleteWebhook"
```

## Project layout

```
api/
  lead.ts             # serverless function: form → Telegram
  tg-webhook.ts       # serverless function: discovery-call bot
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
