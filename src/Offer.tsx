import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initAnalytics } from './analytics';

const CONTACT_EMAIL = 'studio@chsh.online';
const WA_LINK = 'https://wa.me/77757767666';
const LAST_UPDATED = '8 мая 2026';

export default function Offer() {
  // Init trackers (Yandex Metrika / Meta Pixel / TikTok / Clarity) so PageView
  // fires for the /offer route too. initAnalytics() is idempotent.
  useEffect(() => {
    initAnalytics();
  }, []);

  // Page-specific SEO — same per-route pattern as /privacy and /checklist.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Публичная оферта на оказание услуг | chsh studio';

    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute('content') || '';
    desc?.setAttribute(
      'content',
      'Публичная оферта chsh studio: услуги (AI-боты, лендинги, AI-контент, таргет), порядок заказа и оплаты, сроки, гарантии, возврат и контакты.'
    );

    const canonical = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute('href') || '';
    canonical?.setAttribute('href', 'https://chsh.online/offer');

    const ogUrl = document.querySelector('meta[property="og:url"]');
    const prevOgUrl = ogUrl?.getAttribute('content') || '';
    ogUrl?.setAttribute('content', 'https://chsh.online/offer');

    const robots = document.querySelector('meta[name="robots"]');
    const prevRobots = robots?.getAttribute('content') || '';
    robots?.setAttribute('content', 'index, follow');

    return () => {
      document.title = prevTitle;
      desc?.setAttribute('content', prevDesc);
      if (prevCanonical) canonical?.setAttribute('href', prevCanonical);
      if (prevOgUrl) ogUrl?.setAttribute('content', prevOgUrl);
      if (prevRobots) robots?.setAttribute('content', prevRobots);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--bg-main)] text-[color:var(--text)]">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-[-15%] left-[10%] h-[700px] w-[700px] rounded-full bg-[rgba(59,130,246,0.10)] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[5%] h-[600px] w-[600px] rounded-full bg-[rgba(59,130,246,0.06)] blur-[140px]" />
      </div>

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

      <main className="relative z-10 px-5 py-14 sm:py-20">
        <article className="mx-auto max-w-3xl">
          <div className="mb-10">
            <span className="inline-block rounded-full border border-[color:var(--border)] bg-[color:var(--bg-card)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Документ · Republic of Kazakhstan
            </span>
            <h1 className="font-display mt-5 text-[32px] font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
              Публичная оферта
              <br className="hidden sm:block" />
              <span className="text-[color:var(--text-muted)]"> на оказание услуг</span>
            </h1>
            <p className="mt-4 text-[13px] text-[color:var(--text-subtle)] uppercase tracking-[0.14em] font-mono">
              Последнее обновление: {LAST_UPDATED}
            </p>
          </div>

          <div className="space-y-10 text-[15px] leading-[1.7] text-[color:var(--text-muted)]">
            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                1. Стороны и предмет оферты
              </h2>
              <p>
                Настоящий документ является публичной офертой <strong className="text-[color:var(--text)]">chsh studio</strong>{' '}
                (далее — «исполнитель») на заключение договора об оказании услуг с любым физическим или
                юридическим лицом (далее — «заказчик»). Исполнитель оказывает услуги в области AI-внедрения,
                разработки веб-сайтов, производства AI-контента и интернет-маркетинга на территории
                Республики Казахстан.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                2. Какие услуги мы оказываем
              </h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>проектирование и внедрение AI-ассистентов в WhatsApp / Telegram / Instagram Direct;</li>
                <li>разработка конверсионных лендингов и многостраничных сайтов;</li>
                <li>производство AI-контента: вертикальные ролики (Reels / TikTok / YouTube Shorts), UGC-аватары, посты, сценарии;</li>
                <li>настройка и ведение таргетированной рекламы (Meta, TikTok, Google);</li>
                <li>интеграции с CRM (amoCRM, Bitrix24, RetailCRM), аналитикой, платёжными шлюзами;</li>
                <li>аудит и консультации по AI-автоматизации.</li>
              </ul>
              <p className="mt-3">
                Полный текущий перечень услуг и базовые цены — на главной странице сайта{' '}
                <a href="https://chsh.online/" className="text-[color:var(--accent)] hover:underline">
                  chsh.online
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                3. Как заключается договор
              </h2>
              <p>
                Договор считается заключённым с момента, когда заказчик внёс предоплату за услугу
                (или подписал индивидуальный договор / счёт-договор). Точный объём работ, сроки и
                стоимость согласовываются сторонами до начала работ — в переписке (мессенджер, email)
                или в отдельном договоре. Согласованные параметры фиксируются письменно (брифом,
                ТЗ или счёт-договором).
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                4. Цены и оплата
              </h2>
              <p className="mb-3">
                Цены на услуги указаны на сайте в тенге (KZT) и являются ориентировочными. Финальная
                стоимость считается под конкретный проект исходя из объёма работ. Оплата принимается:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>безналичным переводом на счёт ИП / ТОО (по реквизитам в счёте);</li>
                <li>через платёжные системы и банковские переводы;</li>
                <li>криптовалютой (по согласованию).</li>
              </ul>
              <p className="mt-3">
                По умолчанию работы стартуют после получения 50% предоплаты; оставшиеся 50% оплачиваются
                по факту сдачи проекта. Иной порядок может быть согласован индивидуально.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                5. Сроки и порядок исполнения
              </h2>
              <p>
                Стандартные сроки запуска лендинга и AI-бота — 7–14 рабочих дней с момента старта работ
                (получения предоплаты + согласованного брифа). Производство AI-контента — по согласованному
                графику, обычно от 5 рабочих дней. Сроки могут корректироваться при изменении объёма
                работ заказчиком, при задержке материалов от заказчика или по иным причинам, не зависящим
                от исполнителя — об этом стороны договариваются в переписке.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                6. Сдача-приёмка работ
              </h2>
              <p>
                Результат работ передаётся заказчику в виде доступа к рабочему окружению (хостинг,
                CRM, бот, аккаунты), а также архивом исходных материалов / макетов / сценариев. Если
                заказчик в течение 5 рабочих дней с момента передачи результата не сообщает о замечаниях,
                результат считается принятым. Замечания, не относящиеся к согласованному ТЗ
                (новые задачи), оформляются как отдельный заказ.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                7. Гарантии
              </h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  на лендинги и сайты — 30 дней технической поддержки после сдачи (баги вёрстки,
                  поломки в работе форм, проблемы интеграций);
                </li>
                <li>
                  на AI-ботов — 30 дней технической поддержки на устранение ошибок логики, не связанных
                  с изменениями требований заказчика;
                </li>
                <li>
                  на контентные проекты — гарантия соответствия согласованному ТЗ; правки сверх ТЗ
                  оплачиваются отдельно.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                8. Возврат предоплаты
              </h2>
              <p>
                Заказчик имеет право отказаться от услуг в любой момент. Сумма возврата определяется
                как разница между полученной предоплатой и стоимостью фактически выполненных к моменту
                отказа работ. Если работы ещё не начаты — возвращается 100% предоплаты в течение 10
                рабочих дней. Если работы выполнены полностью и приняты — предоплата не возвращается.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                9. Ответственность сторон
              </h2>
              <p>
                Исполнитель несёт ответственность за качество и сроки работ в пределах суммы,
                полученной от заказчика по конкретной услуге. Исполнитель не несёт ответственности
                за бизнес-результаты заказчика (объём продаж, поведение клиентов, поведение рекламных
                площадок), а также за временную недоступность сервисов третьих сторон (Telegram,
                WhatsApp, Meta, TikTok, Vercel и др.), используемых при оказании услуг.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                10. Конфиденциальность и персональные данные
              </h2>
              <p>
                Информация, полученная сторонами в ходе исполнения договора, является конфиденциальной
                и не передаётся третьим лицам без письменного согласия. Обработка персональных данных
                посетителей сайта и заказчиков регулируется{' '}
                <Link to="/privacy" className="text-[color:var(--accent)] hover:underline">
                  Политикой конфиденциальности
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                11. Применимое право
              </h2>
              <p>
                К настоящей оферте и отношениям сторон применяется законодательство Республики
                Казахстан. Споры решаются в порядке переговоров, при недостижении соглашения — в суде
                по месту нахождения исполнителя.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                12. Контакты исполнителя
              </h2>
              <p>
                <strong className="text-[color:var(--text)]">chsh studio</strong> · Казахстан, Алматы / Астана.
                <br />
                Email:{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[color:var(--accent)] hover:underline">
                  {CONTACT_EMAIL}
                </a>
                .
                <br />
                WhatsApp:{' '}
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[color:var(--accent)] hover:underline"
                >
                  +7 775 776 76 66
                </a>
                .
                <br />
                Сайт:{' '}
                <a href="https://chsh.online/" className="text-[color:var(--accent)] hover:underline">
                  https://chsh.online
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-[color:var(--border)] flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-[color:var(--text-subtle)] uppercase tracking-widest">
            <Link to="/" className="hover:text-[color:var(--text)] transition-colors">
              ← На главную
            </Link>
            <Link to="/privacy" className="hover:text-[color:var(--text)] transition-colors">
              Политика конфиденциальности →
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
