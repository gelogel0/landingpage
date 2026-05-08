import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const CONTACT_EMAIL = 'hello@chsh.studio';
const WA_LINK = 'https://wa.me/77757767666';
const LAST_UPDATED = '8 мая 2026';

export default function Privacy() {
  // Page-specific SEO. Same pattern as Checklist: mutate <title>, description,
  // canonical and og:url for the /privacy route so search engines and social
  // previews don't reuse the home-page meta inherited from index.html.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Политика конфиденциальности | chsh studio';

    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute('content') || '';
    desc?.setAttribute(
      'content',
      'Политика конфиденциальности chsh studio: какие персональные данные мы собираем через форму на сайте, как храним, кому передаём и как удалить.'
    );

    const canonical = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute('href') || '';
    canonical?.setAttribute('href', 'https://chsh.online/privacy');

    const ogUrl = document.querySelector('meta[property="og:url"]');
    const prevOgUrl = ogUrl?.getAttribute('content') || '';
    ogUrl?.setAttribute('content', 'https://chsh.online/privacy');

    const robots = document.querySelector('meta[name="robots"]');
    const prevRobots = robots?.getAttribute('content') || '';
    // Legal pages should be indexable but low-priority — index, follow, nofollow on outbound (we have none).
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
      {/* Soft background glow (consistent with Checklist) */}
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
              Политика конфиденциальности
            </h1>
            <p className="mt-4 text-[13px] text-[color:var(--text-subtle)] uppercase tracking-[0.14em] font-mono">
              Последнее обновление: {LAST_UPDATED}
            </p>
          </div>

          <div className="space-y-10 text-[15px] leading-[1.7] text-[color:var(--text-muted)]">
            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                1. Кто оператор данных
              </h2>
              <p>
                Оператор персональных данных — <strong className="text-[color:var(--text)]">chsh studio</strong>{' '}
                (далее — «студия»), AI-студия в Республике Казахстан. Сайт студии:{' '}
                <a href="https://chsh.online/" className="text-[color:var(--accent)] hover:underline">
                  https://chsh.online
                </a>
                . Контакт по вопросам обработки персональных данных:{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[color:var(--accent)] hover:underline">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                2. Какие данные мы собираем
              </h2>
              <p className="mb-3">
                Мы собираем только те данные, которые вы добровольно отправляете через формы на сайте
                (главная страница, страница чек-листа, точки запроса аудита):
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>имя или обращение, как вы хотите чтобы мы к вам обращались;</li>
                <li>контакт для связи: телефон, Telegram-ник или email;</li>
                <li>название и ниша бизнеса (опционально);</li>
                <li>интересующая услуга (опционально);</li>
                <li>сообщение / описание задачи (опционально).</li>
              </ul>
              <p className="mt-3">
                Дополнительно при посещении сайта могут автоматически собираться технические данные:
                IP-адрес, тип браузера, источник перехода (referrer), UTM-метки, страницы, которые вы
                посетили. Эти данные используются только в обезличенном виде для аналитики посещаемости.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                3. Зачем мы собираем эти данные
              </h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>связаться с вами по запросу, который вы оставили через форму;</li>
                <li>
                  подготовить коммерческое предложение, провести бесплатный аудит, отправить запрошенный
                  материал (например, чек-лист);
                </li>
                <li>выполнить договорные обязательства, если вы стали клиентом студии;</li>
                <li>улучшать сайт и качество услуг — обезличенно, по агрегированным метрикам.</li>
              </ul>
              <p className="mt-3">
                Мы <strong className="text-[color:var(--text)]">не используем</strong> ваши данные для
                холодных звонков, спам-рассылок и не передаём их третьим лицам в маркетинговых целях.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                4. Правовое основание обработки
              </h2>
              <p>
                Обработка ваших персональных данных производится на основании вашего согласия,
                выраженного фактом отправки формы на сайте. Вы можете в любой момент отозвать согласие,
                написав на{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[color:var(--accent)] hover:underline">
                  {CONTACT_EMAIL}
                </a>
                . После отзыва мы удалим ваши данные в течение 7 рабочих дней. Обработка соответствует
                Закону Республики Казахстан «О персональных данных и их защите» от 21 мая 2013 года №
                94-V.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                5. Где хранятся данные и кому передаются
              </h2>
              <p className="mb-3">
                Заявки с форм передаются в защищённый рабочий канал студии в мессенджере Telegram через
                Bot API (
                <a
                  href="https://core.telegram.org/bots/api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[color:var(--accent)] hover:underline"
                >
                  core.telegram.org
                </a>
                ). Доступ к каналу имеют только сотрудники студии, работающие с заявками. Telegram
                Messenger Inc. выступает технической площадкой передачи и хранения сообщений (политика:{' '}
                <a
                  href="https://telegram.org/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[color:var(--accent)] hover:underline"
                >
                  telegram.org/privacy
                </a>
                ).
              </p>
              <p>
                Сайт размещён на хостинге{' '}
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[color:var(--accent)] hover:underline"
                >
                  Vercel
                </a>
                . Vercel может временно обрабатывать запросы (логи, метрики производительности) в рамках
                штатной работы своего сервиса. Других внешних получателей ваших данных нет. Мы не
                продаём данные и не передаём их рекламным сетям и брокерам данных.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                6. Срок хранения
              </h2>
              <p>
                Заявки хранятся в рабочем канале до 12 месяцев с момента последнего контакта. Если в
                течение этого срока сотрудничество не состоялось — данные удаляются. Если вы стали
                клиентом, срок хранения определяется требованиями законодательства Республики Казахстан
                по бухгалтерскому и налоговому учёту, но не превышает 5 лет с момента закрытия сделки.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                7. Cookies и аналитика
              </h2>
              <p>
                Сайт использует только технические cookies, необходимые для корректной работы. Если в
                будущем будут подключены счётчики веб-аналитики (Yandex Metrica, Google Analytics или
                аналоги) — это будет отражено в данном документе, и вы получите возможность отказаться
                от cookies через браузер. На текущий момент сторонняя аналитика на сайте не подключена.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                8. Ваши права
              </h2>
              <p className="mb-3">Вы имеете право:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>запросить, какие именно ваши данные у нас есть;</li>
                <li>попросить исправить неточности;</li>
                <li>попросить полностью удалить ваши данные;</li>
                <li>отозвать согласие на обработку;</li>
                <li>
                  обратиться с жалобой в уполномоченный орган Республики Казахстан по защите
                  персональных данных, если считаете, что мы нарушили ваши права.
                </li>
              </ul>
              <p className="mt-3">
                Чтобы воспользоваться любым из этих прав, напишите на{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[color:var(--accent)] hover:underline">
                  {CONTACT_EMAIL}
                </a>{' '}
                или в WhatsApp{' '}
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[color:var(--accent)] hover:underline"
                >
                  +7 775 776 76 66
                </a>
                . Ответ — в течение 7 рабочих дней.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                9. Дети
              </h2>
              <p>
                Услуги студии ориентированы на бизнес и взрослых пользователей. Мы не собираем
                осознанно данные о лицах младше 18 лет. Если вы считаете, что несовершеннолетний
                отправил нам данные без согласия родителей — напишите нам, и мы удалим их.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                10. Изменения политики
              </h2>
              <p>
                Студия может пересматривать этот документ. Дата последнего обновления указана сверху
                страницы. Существенные изменения публикуются на этой странице минимум за 7 дней до
                вступления в силу.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--text)] mb-3">
                11. Контакт
              </h2>
              <p>
                По любым вопросам, связанным с обработкой персональных данных — напишите на{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[color:var(--accent)] hover:underline">
                  {CONTACT_EMAIL}
                </a>{' '}
                или в WhatsApp{' '}
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[color:var(--accent)] hover:underline"
                >
                  +7 775 776 76 66
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-[color:var(--border)] flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-[color:var(--text-subtle)] uppercase tracking-widest">
            <Link to="/" className="hover:text-[color:var(--text)] transition-colors">
              ← На главную
            </Link>
            <Link to="/offer" className="hover:text-[color:var(--text)] transition-colors">
              Публичная оферта →
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
