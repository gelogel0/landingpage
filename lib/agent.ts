// Conversational SDR agent for the chsh studio lead bot.
// Calls the Anthropic Messages API directly via fetch (no SDK dependency) so the
// serverless function stays lightweight. Maintains a brief via tool-calling and
// signals hand-off to a human manager when the lead is qualified.

import type { Brief, ConvMessage, LeadRecord } from './supabase';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `Ты — AI-ассистент студии «chsh studio» (Казахстан). Студия внедряет AI-ботов в WhatsApp/Telegram, конверсионные лендинги, таргет и AI-контент для малого и среднего бизнеса.

ТВОЯ ЗАДАЧА: тёплый первый контакт с лидом, который оставил заявку на сайте. Естественно, по-человечески выяснить потребность, собрать бриф и передать живому менеджеру для бесплатного аудита.

СТИЛЬ:
- На «ты», дружелюбно, коротко, по-русски. Одно сообщение = один вопрос. Без канцелярита и роботизма.
- Не допрашивай: сначала отреагируй на ответ, потом задай следующий вопрос. Немного пользы в каждом сообщении.
- 1–3 коротких предложения на сообщение.

ПОРЯДОК ВЫЯСНЕНИЯ (N-A-T-B, не зачитывай как анкету):
1. Need — что за бизнес и что болит / что хочет автоматизировать; чем сейчас обрабатывает заявки.
2. Authority — кто ещё участвует в решении (мягко, без «вы ЛПР?»).
3. Timing — когда хочет запустить.
4. Budget — мягко и последним: бюджет заложен или пока ресёрч. Никогда не дави.

ИНСТРУМЕНТЫ:
- Как только узнаёшь новый факт — вызывай update_brief (можно частично, только известные поля).
- Когда собрал Need + Timing (по возможности Authority), ИЛИ клиент просит человека/цену/договор, ИЛИ прошло 5–7 сообщений — вызови request_handoff и тепло сообщи, что передаёшь специалисту на бесплатный аудит.

ЖЁСТКИЕ ПРАВИЛА:
- НИКОГДА не называй конкретные цены и сроки, не обещай результат. Спрашивают цену — скажи, что точную цифру под их случай назовёт специалист на бесплатном аудите, и веди к hand-off.
- Не выдумывай возможностей. Не уверен — «уточню у специалиста».
- Ты быстрый консьерж, который доводит до живого человека, а не замена менеджеру.

Если сообщение пользователя = «<<START>>» — он только что перешёл из формы. Тепло поздоровайся (по имени, если известно), коротко скажи, что задашь пару вопросов, чтобы специалист пришёл уже с готовым решением, и задай первый вопрос про задачу.`;

const TOOLS = [
  {
    name: 'update_brief',
    description:
      'Сохранить/обновить факты о лиде по мере выяснения. Передавай только известные поля.',
    input_schema: {
      type: 'object',
      properties: {
        niche: { type: 'string', description: 'Ниша / сфера бизнеса' },
        problem: { type: 'string', description: 'Главная боль / задача' },
        current_channels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Чем обрабатывает заявки сейчас',
        },
        authority: { type: 'string', description: 'Кто принимает решение' },
        timeline: { type: 'string', description: 'Когда хочет запустить' },
        budget_signal: {
          type: 'string',
          enum: ['allocated', 'researching', 'none', 'unknown'],
          description: 'Готовность по бюджету',
        },
      },
    },
  },
  {
    name: 'request_handoff',
    description:
      'Передать лида живому менеджеру на бесплатный аудит. Вызывать, когда собрано достаточно или клиент просит человека/цену.',
    input_schema: {
      type: 'object',
      properties: {
        temperature: {
          type: 'string',
          enum: ['hot', 'warm', 'cold'],
          description: 'Насколько горячий лид',
        },
        summary: { type: 'string', description: 'Саммари для менеджера в 1–3 предложения' },
      },
      required: ['temperature', 'summary'],
    },
  },
];

export type AgentResult = {
  reply: string;
  brief: Brief;
  handoff: { temperature: string; summary: string } | null;
  messages: ConvMessage[];
};

function knownLeadContext(lead: LeadRecord | null): string {
  if (!lead) return '';
  const parts: string[] = [];
  if (lead.name) parts.push(`Имя: ${lead.name}`);
  if (lead.business) parts.push(`Бизнес: ${lead.business}`);
  if (lead.niche) parts.push(`Ниша: ${lead.niche}`);
  if (lead.service) parts.push(`Интересует: ${lead.service}`);
  if (lead.message) parts.push(`Сообщение из формы: ${lead.message}`);
  if (!parts.length) return '';
  return `\n\nИЗВЕСТНО ИЗ ФОРМЫ (используй, не переспрашивай уже известное):\n${parts.join('\n')}`;
}

type Block = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> };

/** Run one user turn through the agent, resolving any tool calls. */
export async function runAgentTurn(opts: {
  apiKey: string;
  model?: string;
  messages: ConvMessage[];
  brief: Brief;
  lead: LeadRecord | null;
}): Promise<AgentResult> {
  const model = opts.model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const system = SYSTEM_PROMPT + knownLeadContext(opts.lead);
  const messages: ConvMessage[] = [...opts.messages];
  let brief: Brief = { ...opts.brief };
  let handoff: AgentResult['handoff'] = null;
  let reply = '';

  for (let i = 0; i < 5; i++) {
    let data: { content?: Block[]; stop_reason?: string };
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'x-api-key': opts.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model, max_tokens: 700, system, tools: TOOLS, messages }),
      });
      if (!res.ok) {
        console.error('[agent] anthropic error', res.status, await res.text());
        break;
      }
      data = (await res.json()) as { content?: Block[]; stop_reason?: string };
    } catch (err) {
      console.error('[agent] anthropic threw', err);
      break;
    }

    const content: Block[] = Array.isArray(data.content) ? data.content : [];
    const text = content
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text as string)
      .join('\n')
      .trim();
    if (text) reply = text;

    messages.push({ role: 'assistant', content });

    if (data.stop_reason === 'tool_use') {
      const toolResults: { type: 'tool_result'; tool_use_id: string; content: string }[] = [];
      for (const block of content) {
        if (block.type !== 'tool_use' || !block.id) continue;
        if (block.name === 'update_brief') {
          brief = { ...brief, ...(block.input as Brief) };
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'ok' });
        } else if (block.name === 'request_handoff') {
          const input = (block.input || {}) as { temperature?: string; summary?: string };
          handoff = { temperature: input.temperature || 'warm', summary: input.summary || '' };
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: 'Передано менеджеру.',
          });
        } else {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'ok' });
        }
      }
      messages.push({ role: 'user', content: toolResults });
      continue; // let the model produce the user-facing message after tools
    }

    break; // end_turn
  }

  if (!reply) {
    reply = 'Спасибо! Передаю информацию специалисту — он скоро напишет 🙌';
  }
  return { reply, brief, handoff, messages };
}
