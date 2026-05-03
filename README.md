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
   - `TG_BOT_TOKEN` = the bot token from @BotFather
   - `TG_CHAT_ID` = the destination chat id (e.g. `-1003773180003` for a private channel — bot must be admin with Post Messages permission)
   - `ALLOW_ORIGIN` (optional) = explicit CORS origin if you serve the site from a different domain than the API
6. Deploy. Subsequent `git push` triggers automatic redeploy.
7. Add a custom domain (e.g. `chsh.studio`) in Project Settings → Domains; SSL provisioned automatically.

## Form → Telegram flow

```
Browser form → POST /api/lead (same origin)
            → api/lead.ts (Vercel Node runtime)
            → POST https://api.telegram.org/bot${TOKEN}/sendMessage
            → Telegram channel
```

Token + chat id are **never** sent to the browser. The serverless function validates the payload, escapes Markdown, caps field lengths, and returns 200/4xx/5xx.

## Project layout

```
api/
  lead.ts             # serverless function: form → Telegram
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
