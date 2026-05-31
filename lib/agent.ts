// Conversational SDR agent for the chsh studio lead bot.
// Provider-agnostic via the OpenAI-compatible Chat Completions API, so the same
// code works with OpenAI today and an OmniRoute (or any OpenAI-compatible)
// gateway later — just change LLM_BASE_URL / LLM_API_KEY / LLM_MODEL.
// Maintains a brief via tool/function-calling and signals hand-off to a human.

import type { Brief, ConvMessage, LeadRecord } from './supabase.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

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

// OpenAI-style function/tool definitions.
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'update_brief',
      description:
        'Сохранить/обновить факты о лиде по мере выяснения. Передавай только известные поля.',
      parameters: {
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
  },
  {
    type: 'function',
    function: {
      name: 'request_handoff',
      description:
        'Передать лида живому менеджеру на бесплатный аудит. Вызывать, когда собрано достаточно или клиент просит человека/цену.',
      parameters: {
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

function safeParse(json: unknown): Record<string, unknown> {
  if (typeof json !== 'string') return (json as Record<string, unknown>) || {};
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

type ToolCall = { id?: string; function?: { name?: string; arguments?: string } };
type ChatMessage = { role: string; content?: string | null; tool_calls?: ToolCall[] };

/** Run one user turn through the agent, resolving any tool calls. */
export async function runAgentTurn(opts: {
  apiKey: string;
  model?: string;
  messages: ConvMessage[];
  brief: Brief;
  lead: LeadRecord | null;
}): Promise<AgentResult> {
  const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = opts.model || process.env.LLM_MODEL || DEFAULT_MODEL;
  const system = SYSTEM_PROMPT + knownLeadContext(opts.lead);
  const history: ConvMessage[] = [...opts.messages];
  let brief: Brief = { ...opts.brief };
  let handoff: AgentResult['handoff'] = null;
  let reply = '';

  for (let i = 0; i < 5; i++) {
    let data: { choices?: { message?: ChatMessage }[] };
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${opts.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 700,
          messages: [{ role: 'system', content: system }, ...history],
          tools: TOOLS,
          tool_choice: 'auto',
        }),
      });
      if (!res.ok) {
        console.error('[agent] LLM error', res.status, await res.text());
        break;
      }
      data = (await res.json()) as { choices?: { message?: ChatMessage }[] };
    } catch (err) {
      console.error('[agent] LLM threw', err);
      break;
    }

    const message = data.choices?.[0]?.message;
    if (!message) break;

    // Persist the assistant message verbatim (must precede any tool results).
    history.push(message as unknown as ConvMessage);

    const toolCalls = message.tool_calls || [];
    if (toolCalls.length > 0) {
      for (const call of toolCalls) {
        const name = call.function?.name;
        const args = safeParse(call.function?.arguments);
        let result = 'ok';
        if (name === 'update_brief') {
          brief = { ...brief, ...(args as Brief) };
        } else if (name === 'request_handoff') {
          handoff = {
            temperature: (args.temperature as string) || 'warm',
            summary: (args.summary as string) || '',
          };
          result = 'Передано менеджеру.';
        }
        history.push({ role: 'tool', tool_call_id: call.id, content: result });
      }
      continue; // let the model produce the user-facing message after tools
    }

    if (typeof message.content === 'string' && message.content.trim()) {
      reply = message.content.trim();
    }
    break; // no tool calls → done
  }

  if (!reply) {
    reply = 'Спасибо! Передаю информацию специалисту — он скоро напишет 🙌';
  }
  return { reply, brief, handoff, messages: history };
}
