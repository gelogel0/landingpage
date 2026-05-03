// Vercel serverless function: receives form data from the chsh.studio landing
// and forwards it to a Telegram chat. Token + chat_id stay server-side.
//
// Required Vercel env vars (Project Settings → Environment Variables):
//   TG_BOT_TOKEN  — bot token from @BotFather
//   TG_CHAT_ID    — destination chat id (e.g. -1003773180003 for a private channel)
//
// Optional:
//   ALLOW_ORIGIN  — explicit allowed origin for CORS (default: same-origin only)

type LeadPayload = {
  name?: string;
  phone?: string;
  business?: string;
  niche?: string;
  service?: string;
  message?: string;
  referrer?: string;
};

function escapeMd(input: string): string {
  // Escape Telegram MarkdownV1 special chars to prevent injection / formatting bugs.
  return input.replace(/([_*`\[\]()])/g, '\\$1');
}

function buildMessage(p: LeadPayload): string {
  const dash = '—';
  const sections: (string | false)[] = [
    '🔔 *Новая заявка с chsh.studio*',
    '',
    `👤 *Имя:* ${escapeMd(p.name?.trim() || dash)}`,
    `📱 *Телефон:* ${escapeMd(p.phone?.trim() || dash)}`,
    `🏢 *Бизнес:* ${escapeMd(p.business?.trim() || dash)}`,
    `🎯 *Ниша:* ${escapeMd(p.niche?.trim() || dash)}`,
    `⚙️ *Услуга:* ${escapeMd(p.service?.trim() || dash)}`,
    p.message?.trim() ? `\n💬 ${escapeMd(p.message.trim())}` : false,
    '',
    `🌐 ${escapeMd(p.referrer?.trim() || 'direct')}`,
  ];
  return sections.filter((line): line is string => line !== false).join('\n');
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
  // CORS: allow same-origin by default; mirror configured origin if set.
  const allowOrigin = process.env.ALLOW_ORIGIN || '';
  if (allowOrigin) res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  if (!token || !chatId) {
    res.status(500).json({
      error: 'Server not configured: TG_BOT_TOKEN / TG_CHAT_ID missing',
    });
    return;
  }

  let payload: LeadPayload;
  try {
    payload = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as LeadPayload;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ error: 'Empty or malformed payload' });
    return;
  }

  // Minimal validation: require at least name OR phone (something contactable).
  const name = (payload.name || '').trim();
  const phone = (payload.phone || '').trim();
  if (!name && !phone) {
    res.status(400).json({ error: 'Name or phone is required' });
    return;
  }

  // Light length cap to prevent abuse.
  for (const k of ['name', 'phone', 'business', 'niche', 'service', 'message', 'referrer'] as const) {
    const v = payload[k];
    if (typeof v === 'string' && v.length > 1000) {
      res.status(400).json({ error: `Field ${k} too long` });
      return;
    }
  }

  const text = buildMessage(payload);

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    if (!tgRes.ok) {
      const body = await tgRes.text();
      console.error('Telegram API error', tgRes.status, body);
      res.status(502).json({ error: 'Upstream send failed' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Lead handler error', err);
    res.status(500).json({ error: 'Send failed' });
  }
}
