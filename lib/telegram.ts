// Shared Telegram Bot API helpers — used by api/lead.ts and api/tg-webhook.ts.
// (Files in lib/ are NOT matched by vercel.json's "api/**/*.ts" function glob,
//  so they are bundled as imports, not deployed as separate functions.)

export type TgUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

/** Escape Telegram MarkdownV1 special chars to prevent formatting/injection bugs. */
export function escapeMd(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/([_*`[\]()])/g, '\\$1');
}

export function userTag(u: TgUser | undefined): string {
  if (!u) return '—';
  if (u.username) return `@${u.username}`;
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return name || `id:${u.id ?? '—'}`;
}

/** Call the Telegram Bot API. Returns parsed JSON or null on failure (logged). */
export async function tg(
  token: string,
  method: string,
  body: unknown
): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text();
      console.error(`[telegram] ${method} failed`, r.status, text);
      return null;
    }
    return (await r.json()) as Record<string, unknown>;
  } catch (err) {
    console.error(`[telegram] ${method} threw`, err);
    return null;
  }
}

/** Build the discovery-call CTA inline keyboard (Calendly if set, else WhatsApp). */
export function ctaKeyboard(): { inline_keyboard: { text: string; url: string }[][] } {
  const calendly = (process.env.CALENDLY_URL || '').trim();
  const waNumber = (process.env.WA_NUMBER || '77757767666').replace(/\D/g, '');
  const url =
    calendly ||
    `https://wa.me/${waNumber}?text=${encodeURIComponent(
      'Привет, прошёл квалификацию у бота — давай созвонимся'
    )}`;
  const label = calendly ? 'Записаться на аудит (30 мин)' : 'Написать в WhatsApp';
  return { inline_keyboard: [[{ text: label, url }]] };
}
