// Vercel serverless function: Telegram webhook for the AI lead-qualification bot.
//
// Flow:
//   /start <token>   →  load form data by token, AI greets + asks first question
//   free-text reply  →  AI continues N-A-T-B discovery, updates the brief
//   (brief ready)    →  AI calls request_handoff → summary to TG_CHAT_ID + CTA to user
//
// Conversation state lives in Supabase (table `conversations`). The agent calls
// Anthropic directly (see lib/agent.ts). If ANTHROPIC_API_KEY or Supabase env is
// missing, the bot degrades gracefully to a static greeting + booking CTA.
//
// Required env: TG_BOT_TOKEN
// For the AI flow: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional: ANTHROPIC_MODEL, CALENDLY_URL, WA_NUMBER, TG_CHAT_ID, TG_WEBHOOK_SECRET

import { tg, escapeMd, userTag, ctaKeyboard } from '../lib/telegram';
import type { TgUser } from '../lib/telegram';
import {
  getConversation,
  saveConversation,
  getLeadByToken,
} from '../lib/supabase';
import type { Brief, Conversation } from '../lib/supabase';
import { runAgentTurn } from '../lib/agent';

type TgUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    from?: TgUser;
    chat?: { id?: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    from?: TgUser;
    message?: { message_id?: number; chat?: { id?: number } };
    data?: string;
  };
};

function aiConfigured(): boolean {
  return (
    !!process.env.ANTHROPIC_API_KEY &&
    !!process.env.SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function tempLabel(t: string): string {
  if (t === 'hot') return '🔥 ГОРЯЧИЙ';
  if (t === 'cold') return '❄️ холодный';
  return '🟢 тёплый';
}

function buildBriefSummary(
  brief: Brief,
  user: TgUser | undefined,
  hand: { temperature: string; summary: string }
): string {
  const lines: (string | false)[] = [
    `${tempLabel(hand.temperature)} *лид · AI-bot*`,
    '',
    `👤 ${escapeMd(userTag(user))}${user?.id ? ` · id:${user.id}` : ''}`,
    brief.niche ? `🎯 *Ниша:* ${escapeMd(brief.niche)}` : false,
    brief.problem ? `🩹 *Боль:* ${escapeMd(brief.problem)}` : false,
    brief.current_channels?.length
      ? `📥 *Каналы:* ${escapeMd(brief.current_channels.join(', '))}`
      : false,
    brief.authority ? `👥 *Решение:* ${escapeMd(brief.authority)}` : false,
    brief.timeline ? `⏰ *Срок:* ${escapeMd(brief.timeline)}` : false,
    brief.budget_signal ? `💰 *Бюджет:* ${escapeMd(brief.budget_signal)}` : false,
    '',
    hand.summary ? `📝 ${escapeMd(hand.summary)}` : false,
  ];
  return lines.filter((l): l is string => l !== false).join('\n');
}

async function sendStaticFallback(token: string, chatId: number, user: TgUser | undefined) {
  await tg(token, 'sendMessage', {
    chat_id: chatId,
    text:
      `Привет${user?.first_name ? `, ${user.first_name}` : ''}! 👋\n\n` +
      `Спасибо за заявку в chsh studio. Нажми кнопку ниже, чтобы записаться на бесплатный 30-минутный аудит — приду с готовыми вариантами под твой бизнес.`,
    reply_markup: ctaKeyboard(),
  });
}

/** Parse "/start <payload>" → payload (or null). */
function parseStartPayload(text: string): string | null {
  const m = text.trim().match(/^\/start(?:\s+(\S+))?/);
  if (!m) return null;
  return m[1] ? m[1].trim() : null;
}

async function handleTurn(
  token: string,
  chatId: number,
  user: TgUser | undefined,
  userText: string,
  isStart: boolean,
  startPayload: string | null
) {
  // No AI configured → static greeting + CTA (zero-config safety net).
  if (!aiConfigured()) {
    await sendStaticFallback(token, chatId, user);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY as string;

  // Load or initialise conversation.
  let conv: Conversation | null = await getConversation(chatId);
  if (isStart || !conv) {
    const leadToken = startPayload || conv?.lead_token || null;
    conv = {
      chat_id: chatId,
      lead_token: leadToken,
      messages: [],
      brief: {},
      done: false,
    };
  }

  // Resolve known form data (only meaningful on first contact / with a token).
  const lead = conv.lead_token ? await getLeadByToken(conv.lead_token) : null;
  if (lead) {
    if (lead.niche && !conv.brief.niche) conv.brief.niche = lead.niche;
    if (lead.service && !conv.brief.problem) conv.brief.problem = lead.service;
  }

  // Append the incoming user message (use a sentinel for the form→bot start).
  const incoming = isStart ? '<<START>>' : userText;
  conv.messages.push({ role: 'user', content: incoming });

  // "typing…" indicator while the model thinks.
  await tg(token, 'sendChatAction', { chat_id: chatId, action: 'typing' });

  const result = await runAgentTurn({
    apiKey,
    messages: conv.messages,
    brief: conv.brief,
    lead,
  });

  conv.messages = result.messages;
  conv.brief = result.brief;

  // Reply to the user in plain text (AI output is not guaranteed Markdown-safe).
  await tg(token, 'sendMessage', {
    chat_id: chatId,
    text: result.reply,
    disable_web_page_preview: true,
  });

  // Hand-off: notify the admin channel and offer the booking CTA.
  if (result.handoff && !conv.done) {
    conv.done = true;
    const adminChatId = process.env.TG_CHAT_ID;
    if (adminChatId) {
      await tg(token, 'sendMessage', {
        chat_id: adminChatId,
        text: buildBriefSummary(conv.brief, user, result.handoff),
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      });
    }
    await tg(token, 'sendMessage', {
      chat_id: chatId,
      text: 'Закрепляю удобное время — записывайся на бесплатный аудит 👇',
      reply_markup: ctaKeyboard(),
    });
  }

  await saveConversation(conv);
}

export default async function handler(
  req: { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => {
      json: (body: unknown) => void;
      send: (body: string) => void;
      end: () => void;
    };
    setHeader: (name: string, value: string) => void;
  }
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.TG_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'TG_BOT_TOKEN not configured' });
    return;
  }

  // Optional webhook secret check (Telegram sends it in this header if set).
  const expectedSecret = process.env.TG_WEBHOOK_SECRET;
  if (expectedSecret) {
    const hdr = req.headers?.['x-telegram-bot-api-secret-token'];
    const provided = Array.isArray(hdr) ? hdr[0] : hdr;
    if (provided !== expectedSecret) {
      res.status(401).json({ error: 'Bad secret' });
      return;
    }
  }

  let update: TgUpdate;
  try {
    update = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as TgUpdate;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }
  if (!update || typeof update !== 'object') {
    res.status(204).end();
    return;
  }

  try {
    // Text messages: /start (form hand-off) or a free-text reply.
    if (update.message?.text) {
      const text = update.message.text.trim();
      const chatId = update.message.chat?.id;
      if (chatId) {
        const isStart = text.startsWith('/start');
        const payload = isStart ? parseStartPayload(text) : null;
        await handleTurn(token, chatId, update.message.from, text, isStart, payload);
      }
      res.status(200).json({ ok: true });
      return;
    }

    // Legacy inline-keyboard callbacks (old button flow): just acknowledge.
    if (update.callback_query) {
      await tg(token, 'answerCallbackQuery', { callback_query_id: update.callback_query.id });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(204).end();
  } catch (err) {
    console.error('[tg-webhook] handler error', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
