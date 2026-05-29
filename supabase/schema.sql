-- chsh studio — Supabase schema for the AI SDR lead bot.
-- Run once in Supabase → SQL Editor (or via the CLI). Uses the service-role key
-- from the serverless functions, so Row Level Security is left off here; do NOT
-- expose these tables to the anon/public key.

create extension if not exists "pgcrypto";

-- Form submissions from the landing (one row per /api/lead POST).
-- `token` is handed to the user as a Telegram deep-link payload
-- (t.me/<bot>?start=<token>) so the bot can greet them already knowing the form.
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null,
  name        text,
  phone       text,
  business    text,
  niche       text,
  service     text,
  message     text,
  referrer    text,
  created_at  timestamptz not null default now()
);

-- Per-chat AI conversation state. `messages` holds the raw Anthropic message
-- objects (role + content blocks), `brief` is the structured N-A-T-B brief.
create table if not exists public.conversations (
  chat_id     bigint primary key,
  lead_token  text,
  messages    jsonb not null default '[]'::jsonb,
  brief       jsonb not null default '{}'::jsonb,
  done        boolean not null default false,
  updated_at  timestamptz not null default now()
);

create index if not exists conversations_lead_token_idx on public.conversations (lead_token);
