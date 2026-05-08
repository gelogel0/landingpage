import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { initAnalytics, trackGoal } from './analytics';

const LEAD_ENDPOINT = '/api/lead';
const WA_LINK = 'https://wa.me/77757767666';
const TG_LINK = 'https://t.me/xcabczxabcz';
const CHECKLIST_SOURCE = 'AI-чеклист (10 признаков)';

type ChecklistItem = {
  title: string;
  body: string;
  fix: string;
};

const ITEMS: ChecklistItem[] = [
  {
    title: 'Клиенты пишут после рабочих часов — и не получают ответа',
    body: 'Если 30%+ запросов приходят вечером, ночью или в выходные, ты теряешь горячих лидов прямо сейчас. Утром они уже у конкурента.',
    fix: 'AI-бот отвечает 24/7 за 1–2 секунды. Конверсия первого касания растёт в 2–3 раза.',
  },
  {
    title: 'Менеджер тратит 60–80% времени на одинаковые вопросы',
    body: '«Сколько стоит», «когда работаете», «как записаться», «есть ли свободное время» — это не работа, это рутина.',
    fix: 'Бот закрывает 70% типовых заявок сам. Менеджер занимается только тёплыми лидами и допродажей.',
  },
  {
    title: 'Заявки теряются между мессенджерами',
    body: 'WhatsApp, Direct, Telegram, форма на сайте, иногда даже почта — следить за всем невозможно. Часть заявок уходит без ответа.',
    fix: 'Бот собирает все каналы в одно окно (CRM или Telegram-уведомления) и отвечает мгновенно вне зависимости от площадки.',
  },
  {
    title: 'Конверсия из заявки в запись падает после 3 минут',
    body: 'Каждые 5 минут ожидания снижают шанс продажи на ~7%. Через час «горячий лид» уже не горячий — он ушёл в Google или к конкуренту.',
    fix: 'Бот делает первое касание мгновенно и ведёт диалог по скрипту до записи или передачи менеджеру.',
  },
  {
    title: 'Нет автоматической записи в календарь',
    body: 'Клиент пишет «хочу на маникюр» → менеджер уточняет дату → сверяется с журналом → пишет назад → клиент уже не отвечает. 5–7 сообщений вместо одного.',
    fix: 'Бот показывает свободные слоты сразу из календаря и записывает в один клик. Подтверждение приходит и клиенту, и в CRM.',
  },
  {
    title: 'Ты сам отвечаешь клиентам по вечерам',
    body: 'Признак, что бизнес держится на тебе. Это не масштабируется и приводит к выгоранию.',
    fix: 'AI-бот закрывает рутину. Тебе остаются только стратегия и тёплые звонки.',
  },
  {
    title: 'Реклама даёт лиды, но конверсия в продажу низкая',
    body: 'Часто проблема не в трафике, а в скорости и качестве первого касания. Холодный лид остывает за минуты.',
    fix: 'Бот квалифицирует заявку за 30 секунд (бюджет, срочность, нишa) и передаёт горячую заявку менеджеру с уже собранным контекстом.',
  },
  {
    title: 'Клиенты задают вопросы, которые есть на сайте',
    body: 'Значит, либо сайт сложный, либо им лень читать. И то, и другое — норма. Заставлять клиента «изучать» — путь к потере.',
    fix: 'AI-бот отвечает в чате на основе твоей базы знаний: цены, услуги, расписание, политика возвратов. Клиент не уходит.',
  },
  {
    title: 'Нет повторных продаж и рассылок',
    body: 'База клиентов есть, но сидит мёртвым грузом. 80% выручки большинства сервисных бизнесов — это повторные клиенты, которых никто не возвращает.',
    fix: 'Бот пишет первым по триггерам: «Прошло 3 недели — пора подровнять стрижку?», «Месяц с последней чистки», «День рождения — скидка 20%».',
  },
  {
    title: 'Конкуренты уже отвечают быстрее',
    body: 'Если соседний салон отвечает в Direct за 30 секунд, а ты за час — клиент уйдёт к нему. Это не «может быть», это уже происходит.',
    fix: 'Скорость ответа сейчас — это новый сильный USP. Бот делает её бесплатной и постоянной.',
  },
];

type FormState = {
  name: string;
  contact: string; // Telegram @ или телефон
  niche: string;
};

const NICHE_OPTIONS = [
  'Салон красоты',
  'Стоматология',
  'Фитнес-клуб',
  'Ресторан / кафе',
  'Доставка еды',
  'Образование / курсы',
  'Автосервис',
  'Медцентр',
  'Юр. услуги',
  'Интернет-магазин',
  'Другое',
];

const initialForm: FormState = { name: '', contact: '', niche: '' };

export default function Checklist() {
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Init analytics on mount.
  useEffect(() => {
    initAnalytics();
  }, []);

  // Page-specific SEO. Mutate <title>, description, canonical and og:url for the
  // /checklist route so search engines and social previews don't reuse the
  // home-page meta inherited from index.html.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'AI-чек-лист — 10 признаков что бизнесу нужен AI-бот | chsh studio';

    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute('content') || '';
    desc?.setAttribute(
      'content',
      'Бесплатный чек-лист от chsh studio: 10 признаков, что вашему бизнесу пора внедрить AI-бота. Для салонов, стоматологий, фитнес-клубов, ресторанов и онлайн-магазинов в Казахстане.'
    );

    const canonical = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute('href') || '';
    canonical?.setAttribute('href', 'https://chsh.online/checklist');

    const ogUrl = document.querySelector('meta[property="og:url"]');
    const prevOgUrl = ogUrl?.getAttribute('content') || '';
    ogUrl?.setAttribute('content', 'https://chsh.online/checklist');

    return () => {
      document.title = prevTitle;
      desc?.setAttribute('content', prevDesc);
      if (prevCanonical) canonical?.setAttribute('href', prevCanonical);
      if (prevOgUrl) ogUrl?.setAttribute('content', prevOgUrl);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const name = formData.name.trim();
      const contact = formData.contact.trim();
      if (!name || !contact) {
        setError('Заполни имя и контакт.');
        setSubmitting(false);
        return;
      }

      // Decide whether contact is a phone or a TG handle.
      const isPhone = /^[+\d][\d\s()\-+]{6,}$/.test(contact);
      const payload = {
        name,
        phone: isPhone ? contact : '',
        business: '',
        niche: formData.niche,
        service: CHECKLIST_SOURCE,
        message: !isPhone ? `Контакт (TG/email): ${contact}` : '',
        referrer:
          typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
      };

      const resp = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Lead endpoint ${resp.status}: ${txt}`);
      }

      setSubmitted(true);
      trackGoal('checklist_optin', { niche: formData.niche || undefined });

      // Smooth scroll to the revealed content.
      setTimeout(() => {
        document.getElementById('checklist-content')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 50);
    } catch (err) {
      console.error('Checklist optin error:', err);
      setError('Не удалось отправить. Напиши в WhatsApp ниже — пришлю чек-лист руками.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--bg-main)] text-[color:var(--text)]">
      {/* Soft background glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-[-15%] left-[10%] h-[700px] w-[700px] rounded-full bg-[rgba(59,130,246,0.10)] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[5%] h-[600px] w-[600px] rounded-full bg-[rgba(59,130,246,0.06)] blur-[140px]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 border-b border-[color:var(--border)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="block h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity">
            <img
              src="/logo.png"
              alt="chsh studio"
              className="block h-full w-auto select-none object-contain"
              draggable={false}
            />
          </Link>
          <Link
            to="/"
            className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors inline-flex items-center gap-1"
          >
            ← На главную
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-5 pt-14 pb-10 sm:pt-20 sm:pb-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-[color:var(--border)] bg-[color:var(--bg-card)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Бесплатный чек-лист · PDF не нужен
          </span>
          <h1 className="font-display mt-5 text-[34px] font-semibold leading-[1.05] tracking-tight sm:text-[52px] md:text-[60px]">
            10 признаков что бизнесу <br className="hidden sm:block" />
            <span className="text-[color:var(--accent)] glow-text">пора AI-бота</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-[1.65] text-[color:var(--text-muted)] sm:text-[16px]">
            Если 5 из 10 пунктов про твой бизнес — ты теряешь деньги каждую неделю. Чек-лист для салонов, стоматологий, фитнес-клубов, кафе, доставки, образования и онлайн-магазинов.
          </p>
        </div>

        {/* Opt-in card */}
        <div className="mx-auto mt-10 max-w-xl">
          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-6 sm:p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <p className="text-[12px] uppercase tracking-[0.18em] text-[color:var(--accent)]">
                Открыть чек-лист
              </p>
              <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight">
                Получить за 30 секунд
              </h2>
              <p className="mt-2 text-[13px] text-[color:var(--text-muted)]">
                Чек-лист откроется ниже сразу после отправки. Не спамим, продаём в 2 касания максимум.
              </p>

              <div className="mt-6 grid gap-4">
                <label className="block">
                  <span className="block text-[12px] uppercase tracking-[0.14em] text-[color:var(--text-muted)] mb-2">
                    Имя
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder="Олег"
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-3 text-[15px] text-[color:var(--text)] placeholder-[color:var(--text-subtle)] outline-none transition-colors focus:border-[color:var(--accent)]"
                  />
                </label>

                <label className="block">
                  <span className="block text-[12px] uppercase tracking-[0.14em] text-[color:var(--text-muted)] mb-2">
                    Telegram или телефон
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.contact}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, contact: e.target.value }))
                    }
                    placeholder="@username или +7 ___ ___ __ __"
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-3 text-[15px] text-[color:var(--text)] placeholder-[color:var(--text-subtle)] outline-none transition-colors focus:border-[color:var(--accent)]"
                  />
                </label>

                <label className="block">
                  <span className="block text-[12px] uppercase tracking-[0.14em] text-[color:var(--text-muted)] mb-2">
                    Ниша (опционально)
                  </span>
                  <select
                    value={formData.niche}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, niche: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-3 text-[15px] text-[color:var(--text)] outline-none transition-colors focus:border-[color:var(--accent)]"
                  >
                    <option value="">— выбрать —</option>
                    {NICHE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error && (
                <p className="mt-4 text-[13px] text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-lg bg-[color:var(--accent)] px-6 py-3.5 text-[14px] font-semibold uppercase tracking-[0.12em] text-white transition-all hover:bg-[color:var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Отправка…' : 'Открыть чек-лист'}
              </button>
              <p className="mt-3 text-center text-[11px] text-[color:var(--text-subtle)]">
                Нажимая, ты соглашаешься получить ответ в WhatsApp/Telegram.
              </p>
            </form>
          ) : (
            <div className="rounded-2xl border border-[color:var(--accent)]/40 bg-[color:var(--bg-card)] p-6 sm:p-8 text-center">
              <p className="text-[12px] uppercase tracking-[0.18em] text-[color:var(--accent)]">
                Готово
              </p>
              <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight">
                Чек-лист открыт ниже ↓
              </h2>
              <p className="mt-3 text-[13px] text-[color:var(--text-muted)]">
                Я свяжусь с тобой в течение 24 часов и предложу бесплатный аудит.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Checklist content (visible after submit, or always after a CSS class — we use the submitted flag). */}
      <section
        id="checklist-content"
        className={`relative z-10 px-5 pb-20 transition-opacity duration-700 ${
          submitted ? 'opacity-100' : 'opacity-30 pointer-events-none select-none blur-sm'
        }`}
      >
        <div className="mx-auto max-w-3xl">
          <div className="mt-12 mb-8 text-center">
            <span className="inline-block rounded-full border border-[color:var(--border)] bg-[color:var(--bg-card)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Чек-лист
            </span>
            <h2 className="font-display mt-4 text-[28px] font-semibold leading-tight tracking-tight sm:text-[36px]">
              10 признаков
            </h2>
            <p className="mt-2 text-[13px] text-[color:var(--text-muted)]">
              Считай: сколько пунктов про твой бизнес.
            </p>
          </div>

          <ol className="space-y-4">
            {ITEMS.map((item, i) => (
              <li
                key={i}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-5 sm:p-6 transition-colors hover:border-[color:var(--accent)]/40"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent-soft)] font-display text-[16px] font-semibold text-[color:var(--accent)]">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-[18px] font-semibold leading-snug text-[color:var(--text)] sm:text-[20px]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.65] text-[color:var(--text-muted)]">
                      {item.body}
                    </p>
                    <p className="mt-3 inline-block rounded-md bg-[color:var(--accent-soft)] px-3 py-1.5 text-[12px] text-[color:var(--accent-hover)]">
                      → {item.fix}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {/* Bottom CTA */}
          <div className="mt-12 rounded-2xl border border-[color:var(--accent)]/40 bg-gradient-to-b from-[color:var(--bg-card)] to-[color:var(--bg-surface)] p-6 sm:p-10 text-center shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_30px_80px_rgba(59,130,246,0.08)]">
            <p className="text-[12px] uppercase tracking-[0.18em] text-[color:var(--accent)]">
              5+ пунктов про тебя?
            </p>
            <h3 className="font-display mt-3 text-[28px] font-semibold leading-tight tracking-tight sm:text-[36px]">
              Сделаю бесплатный аудит за 24 часа
            </h3>
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-[1.65] text-[color:var(--text-muted)]">
              Скину конкретный план: какой бот ставим, в какие каналы, что он закрывает, сколько это даст в месяц. Без воды и продажи в лоб.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={WA_LINK}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto rounded-lg bg-[color:var(--accent)] px-6 py-3 text-[14px] font-semibold uppercase tracking-[0.12em] text-white transition-all hover:bg-[color:var(--accent-hover)]"
              >
                Написать в WhatsApp
              </a>
              <a
                href={TG_LINK}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-6 py-3 text-[14px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              >
                Написать в Telegram
              </a>
            </div>
            <p className="mt-5 text-[11px] text-[color:var(--text-subtle)]">
              Или вернись на <Link to="/" className="text-[color:var(--accent)] hover:underline">главную</Link> — там цены и услуги.
            </p>
          </div>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="relative z-10 border-t border-[color:var(--border)] py-8 text-center text-[11px] text-[color:var(--text-subtle)]">
        © chsh studio · {new Date().getFullYear()} · AI automation для бизнеса в Казахстане
      </footer>
    </div>
  );
}
