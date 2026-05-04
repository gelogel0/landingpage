// Vercel serverless function: Telegram webhook for the discovery-call
// qualification bot. Stateless — all state is encoded in callback_data so
// no DB is required.
//
// Flow:
//   /start (any payload)              →  greet + ask Q1 (niche)
//   user clicks niche button          →  ask Q2 (budget)
//   user clicks budget button         →  ask Q3 (urgency)
//   user clicks urgency button        →  ask Q4 (pain)
//   user clicks pain button           →  send summary to TG_CHAT_ID
//                                        + reply user with Calendly/WA link
//
// Required Vercel env vars:
//   TG_BOT_TOKEN  — bot token (same as /api/lead)
//   TG_CHAT_ID    — destination chat for lead summaries (same channel as /api/lead)
// Optional:
//   CALENDLY_URL  — public Calendly booking link (e.g. https://calendly.com/.../audit-30min)
//                   if unset, the bot replies with a WhatsApp deep-link instead.
//   WA_NUMBER     — WhatsApp number (digits only) for the fallback CTA.
//                   defaults to 77757767666.
//   TG_WEBHOOK_SECRET — if set, every webhook request must include the matching
//                   X-Telegram-Bot-Api-Secret-Token header. Use to prevent spoofed
//                   webhook calls from anonymous attackers.

const NICHES: { code: string; label: string }[] = [
  { code: '1', label: 'Салон красоты' },
  { code: '2', label: 'Стоматология' },
  { code: '3', label: 'Фитнес-клуб' },
  { code: '4', label: 'Ресторан / кафе' },
  { code: '5', label: 'Доставка' },
  { code: '6', label: 'Образование' },
  { code: '7', label: 'Медцентр' },
  { code: '8', label: 'Интернет-магазин' },
  { code: '9', label: 'Другое' },
];

const BUDGETS: { code: string; label: string }[] = [
  { code: 'a', label: 'до 300 000 ₸' },
  { code: 'b', label: '300 000 – 700 000 ₸' },
  { code: 'c', label: '700 000 – 1 500 000 ₸' },
  { code: 'd', label: '1 500 000+ ₸' },
  { code: 'e', label: 'Просто узнаю стоимость' },
];

const URGENCIES: { code: string; label: string }[] = [
  { code: '1', label: 'В этом месяце' },
  { code: '2', label: '1–2 месяца' },
  { code: '3', label: '3+ месяца' },
  { code: '4', label: 'Просто смотрю' },
];

const PAINS: { code: string; label: string }[] = [
  { code: '1', label: 'Теряю заявки в нерабочее время' },
  { code: '2', label: 'Менеджер не справляется с потоком' },
  { code: '3', label: 'Хочу автоматизировать рутину' },
  { code: '4', label: 'Нужны клиенты с рекламы' },
  { code: '5', label: 'Нужен виральный AI-контент' },
  { code: '6', label: 'Другое' },
];

type AnswerMap = Record<string, string>;

function lookup(list: { code: string; label: string }[], code: string): string {
  return list.find((x) => x.code === code)?.label || code;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buttonsFor(
  step: number,
  picked: AnswerMap,
  list: { code: string; label: string }[],
  cols = 2
): unknown {
  const buttons = list.map((opt) => {
    const data = encodeAnswers({ ...picked, [`s${step}`]: opt.code });
    return { text: opt.label, callback_data: `q${step + 1}|${data}` };
  });
  return { inline_keyboard: chunk(buttons, cols) };
}

function encodeAnswers(map: AnswerMap): string {
  // compact: s1=3,s2=b,s3=1 → "1:3|2:b|3:1"
  return Object.entries(map)
    .map(([k, v]) => `${k.replace('s', '')}:${v}`)
    .join('|');
}

function decodeAnswers(s: string): AnswerMap {
  const out: AnswerMap = {};
  if (!s) return out;
  for (const part of s.split('|')) {
    const [k, v] = part.split(':');
    if (k && v) out[`s${k}`] = v;
  }
  return out;
}

async function tg(token: string, method: string, body: unknown): Promise<unknown> {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    console.error(`[tg-webhook] ${method} failed`, r.status, text);
  }
  return r.ok ? r.json() : null;
}

function escapeMd(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/([_*`\[\]()])/g, '\\$1');
}

type TgUser = { id?: number; username?: string; first_name?: string; last_name?: string };

function userTag(u: TgUser | undefined): string {
  if (!u) return '—';
  if (u.username) return `@${u.username}`;
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return name || `id:${u.id ?? '—'}`;
}

function buildSummary(answers: AnswerMap, user: TgUser | undefined): string {
  const lines = [
    '🟢 *Quallified лид · discovery-bot*',
    '',
    `👤 ${escapeMd(userTag(user))}${user?.id ? ` · id:${user.id}` : ''}`,
    `🎯 *Ниша:* ${escapeMd(lookup(NICHES, answers.s1 || ''))}`,
    `💰 *Бюджет:* ${escapeMd(lookup(BUDGETS, answers.s2 || ''))}`,
    `⏰ *Срочность:* ${escapeMd(lookup(URGENCIES, answers.s3 || ''))}`,
    `🔥 *Боль:* ${escapeMd(lookup(PAINS, answers.s4 || ''))}`,
  ];
  return lines.join('\n');
}

const CTA_FALLBACK_TEMPLATE = (waNumber: string) =>
  `https://wa.me/${waNumber}?text=${encodeURIComponent(
    'Привет, прошёл квалификацию у бота — давай созвонимся'
  )}`;

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

async function handleStart(token: string, chatId: number, user: TgUser | undefined) {
  const greeting =
    `Привет${user?.first_name ? `, ${user.first_name}` : ''}! 👋\n\n` +
    `Я квалифицирующий бот *chsh studio*. Задам 4 коротких вопроса, потом дам ссылку на бесплатный 30-минутный аудит со студией.\n\n` +
    `Если 5+ пунктов из чек-листа про твой бизнес — этот разговор окупится много раз.\n\n` +
    `*Вопрос 1 из 4*\nКакая у тебя ниша?`;
  await tg(token, 'sendMessage', {
    chat_id: chatId,
    text: greeting,
    parse_mode: 'Markdown',
    reply_markup: buttonsFor(1, {}, NICHES, 2),
  });
}

async function editStep(
  token: string,
  chatId: number,
  messageId: number,
  step: number,
  picked: AnswerMap
) {
  const prompts: Record<number, string> = {
    2: '*Вопрос 2 из 4*\nКакой у тебя бюджет на запуск AI-системы?',
    3: '*Вопрос 3 из 4*\nКогда нужно запустить?',
    4: '*Вопрос 4 из 4*\nЧто главное болит сейчас?',
  };
  const lists: Record<number, { code: string; label: string }[]> = {
    2: BUDGETS,
    3: URGENCIES,
    4: PAINS,
  };
  await tg(token, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: prompts[step] || `*Вопрос ${step}*`,
    parse_mode: 'Markdown',
    reply_markup: buttonsFor(step, picked, lists[step], step >= 4 ? 1 : 2),
  });
}

async function finishFlow(
  token: string,
  userChatId: number,
  messageId: number,
  user: TgUser | undefined,
  answers: AnswerMap
) {
  const adminChatId = process.env.TG_CHAT_ID;
  const calendly = (process.env.CALENDLY_URL || '').trim();
  const waNumber = (process.env.WA_NUMBER || '77757767666').replace(/\D/g, '');

  // 1) Notify admin channel.
  if (adminChatId) {
    await tg(token, 'sendMessage', {
      chat_id: adminChatId,
      text: buildSummary(answers, user),
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
  }

  // 2) Reply to user with the booking CTA.
  const cta = calendly || CTA_FALLBACK_TEMPLATE(waNumber);
  const ctaLabel = calendly ? 'Записаться на аудит (30 минут)' : 'Написать в WhatsApp';

  await tg(token, 'editMessageText', {
    chat_id: userChatId,
    message_id: messageId,
    text:
      `🟢 *Готово.* Вот что я понял про твой бизнес:\n\n` +
      `*Ниша:* ${escapeMd(lookup(NICHES, answers.s1 || ''))}\n` +
      `*Бюджет:* ${escapeMd(lookup(BUDGETS, answers.s2 || ''))}\n` +
      `*Срочность:* ${escapeMd(lookup(URGENCIES, answers.s3 || ''))}\n` +
      `*Боль:* ${escapeMd(lookup(PAINS, answers.s4 || ''))}\n\n` +
      `Ниже — кнопка для записи на бесплатный 30-минутный аудит. Я буду готов с вариантами под твой кейс.`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: ctaLabel, url: cta }]],
    },
  });
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
    // Plain text messages — only handle /start*
    if (update.message?.text) {
      const text = update.message.text.trim();
      const chatId = update.message.chat?.id;
      if (chatId && text.startsWith('/start')) {
        await handleStart(token, chatId, update.message.from);
      }
      // Telegram requires a 200 to ack the update.
      res.status(200).json({ ok: true });
      return;
    }

    // Inline keyboard answer
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;
      const data = cb.data || '';
      // Always answer the callback first to dismiss the spinner on the user's side.
      await tg(token, 'answerCallbackQuery', { callback_query_id: cb.id });

      if (chatId && messageId) {
        // data format: q<nextStep>|<encoded answers>
        const [head, payload] = data.split('|', 2);
        const nextStep = head?.startsWith('q') ? Number(head.slice(1)) : NaN;
        const answers = decodeAnswers(data.slice(head.length + 1));
        if (Number.isFinite(nextStep) && answers && nextStep <= 4) {
          await editStep(token, chatId, messageId, nextStep, answers);
        } else if (Number.isFinite(nextStep) && nextStep === 5) {
          await finishFlow(token, chatId, messageId, cb.from, answers);
        } else {
          // Unknown callback data — graceful no-op
          console.warn('[tg-webhook] unknown callback', data, 'payload:', payload);
        }
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(204).end();
  } catch (err) {
    console.error('[tg-webhook] handler error', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
