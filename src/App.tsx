import { useEffect, useState } from 'react';
import UnicornScene from 'unicornstudio-react';
import { initAnalytics, trackGoal } from './analytics';

// Lead intake endpoint — Vercel serverless function (proxies to Telegram).
// Token + chat_id stay server-side as env vars (TG_BOT_TOKEN, TG_CHAT_ID).
const LEAD_ENDPOINT = '/api/lead';

// Контакты (примеры — заменить на реальные)
const WA_NUMBER = '77757767666'; // +7 775 776 76 66
const WA_LINK = `https://wa.me/${WA_NUMBER}`;
const TG_USERNAME = 'xcabczxabcz';
const TG_LINK = `https://t.me/${TG_USERNAME}`;
const EMAIL = 'hello@chsh.studio';
const PORTFOLIO_LINK = 'https://oc-portfolio-olive.vercel.app/';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          icon: string;
          width?: string | number;
          height?: string | number;
        },
        HTMLElement
      >;
    }
  }
}

type FormState = {
  name: string;
  phone: string;
  business: string;
  niche: string;
  service: string;
  message: string;
};

const initialForm: FormState = {
  name: '',
  phone: '',
  business: '',
  niche: '',
  service: '',
  message: '',
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
  'Другое',
];

const SERVICE_OPTIONS: { value: string; label: string }[] = [
  { value: 'bot', label: 'AI-ассистент в WhatsApp / Direct' },
  { value: 'website', label: 'Конверсионный лендинг' },
  { value: 'ads', label: 'Таргет + воронка' },
  { value: 'video', label: 'AI-видео для соцсетей' },
  { value: 'content', label: 'AI-контент (Reels, посты, сценарии)' },
  { value: 'multi', label: 'Комплекс (всё вместе)' },
];

export default function App() {
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePipeline, setActivePipeline] = useState<0 | 1 | 2>(0);
  const [heroPanel, setHeroPanel] = useState<'input' | 'output'>('input');
  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1440,
    h: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Analytics — Yandex Metrika / Meta Pixel / TikTok Pixel / Clarity. Each
  // tracker is opt-in via env var; missing IDs are silently skipped.
  useEffect(() => {
    initAnalytics();
  }, []);

  // Scroll-reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Hero sphere "fades into a star at the horizon" as the form/footer enter
  useEffect(() => {
    const hero = document.getElementById('parallax-sphere');
    const trigger = document.getElementById('quote') ?? document.getElementById('contact');
    if (!hero || !trigger) return;
    const onScroll = () => {
      const tr = trigger.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress: 0 when section is at bottom of viewport, 1 when section top reaches ~25% from top
      const raw = (vh - tr.top) / (vh * 0.75);
      const progress = Math.max(0, Math.min(1, raw));
      const scale = 1 - progress * 0.92;
      const opacity = 1 - progress * 0.95;
      const ty = progress * vh * 0.6;
      hero.style.setProperty('--hero-scale', String(scale));
      hero.style.setProperty('--hero-opacity', String(opacity));
      hero.style.setProperty('--hero-ty', `${ty}px`);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Parallax bg
  useEffect(() => {
    const grid = document.getElementById('parallax-grid');
    const g1 = document.getElementById('parallax-glow-1');
    const g2 = document.getElementById('parallax-glow-2');
    const onScroll = () => {
      const y = window.scrollY;
      if (grid) grid.style.transform = `perspective(500px) rotateX(20deg) translateY(${y * 0.2}px)`;
      if (g1) g1.style.transform = `translateY(${y * 0.4}px)`;
      if (g2) g2.style.transform = `translateY(${y * 0.15}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cursor trail
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (isCoarse) return;
    const canvas = document.getElementById('cursor-trail') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    type Pt = { x: number; y: number; life: number };
    const trail: Pt[] = [];
    let mx = -9999, my = -9999, hasMouse = false;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      hasMouse = true;
      trail.push({ x: mx, y: my, life: 1 });
      if (trail.length > 40) trail.shift();
    };
    const onLeave = () => { hasMouse = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        p.life *= 0.92;
        const alpha = p.life * 0.55;
        const r = 22 + (1 - p.life) * 38;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grad.addColorStop(0, `rgba(96, 165, 250, ${alpha})`);
        grad.addColorStop(0.45, `rgba(59, 130, 246, ${alpha * 0.35})`);
        grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // remove dead
      while (trail.length && trail[0].life < 0.04) trail.shift();

      if (hasMouse) {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 50);
        grad.addColorStop(0, 'rgba(147, 197, 253, 0.45)');
        grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.18)');
        grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, 50, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
    };
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.startsWith('8')) v = '7' + v.substring(1);
    if (!v.startsWith('7') && v.length > 0) v = '7' + v;
    v = v.substring(0, 11);
    let f = '';
    if (v.length > 0) f = '+' + v.substring(0, 1);
    if (v.length > 1) f += ' ' + v.substring(1, 4);
    if (v.length > 4) f += ' ' + v.substring(4, 7);
    if (v.length > 7) f += ' ' + v.substring(7, 9);
    if (v.length > 9) f += ' ' + v.substring(9, 11);
    setFormData((prev) => ({ ...prev, phone: f }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const serviceLabel =
        SERVICE_OPTIONS.find((s) => s.value === formData.service)?.label || '';
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        business: formData.business.trim(),
        niche: formData.niche,
        service: serviceLabel,
        message: formData.message.trim(),
        referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
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
      setFormData(initialForm);
      trackGoal('lead_submit', {
        niche: formData.niche || undefined,
        service: serviceLabel || undefined,
      });
    } catch (err) {
      console.error('Form error:', err);
      setError('Не удалось отправить. Напишите напрямую в WhatsApp ниже.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-[color:var(--text-muted)] antialiased relative">
      {/* Parallax bg */}
      <div className="parallax-wrapper">
        <div className="bg-grid" id="parallax-grid"></div>
        <div className="bg-glow-1" id="parallax-glow-1"></div>
        <div className="bg-glow-2" id="parallax-glow-2"></div>
        <div className="unicorn-stage" id="parallax-sphere">
          <UnicornScene
            projectId="q4o3kYSFz0KUDDgOf0gx"
            width={`${viewport.w}px`}
            height={`${viewport.h}px`}
            scale={1}
            dpi={1.5}
            sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@2.1.11/dist/unicornStudio.umd.js"
          />
        </div>
      </div>
      <canvas id="cursor-trail" className="cursor-trail-canvas"></canvas>
      <div className="noise-overlay"></div>

      {/* NAV */}
      <nav className="fixed top-0 w-full z-40 bg-[color:var(--bg-main)]/80 backdrop-blur-md border-b border-[color:var(--border)]">
        <div className="sm:px-6 flex h-16 max-w-7xl mx-auto px-4 items-center justify-between">
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href="#home" className="block cursor-pointer hover:opacity-80 transition-opacity h-11 sm:h-12">
              <img
                src="/logo.png"
                alt="chsh studio"
                className="h-full w-auto object-contain block select-none pointer-events-none"
                draggable={false}
              />
            </a>
          </div>

          <div className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
            <a href="#services" className="px-1 py-2 text-[13px] font-medium text-[color:var(--text)] hover:text-[color:var(--accent)] transition-colors tracking-tight">Услуги</a>
            <a href="#process" className="px-1 py-2 text-[13px] font-normal text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors tracking-tight">Процесс</a>
            <a href="#pricing" className="px-1 py-2 text-[13px] font-normal text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors tracking-tight">Тарифы</a>
            <a href="#outcomes" className="px-1 py-2 text-[13px] font-normal text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors tracking-tight">Результаты</a>
            <a href={PORTFOLIO_LINK} target="_blank" rel="noreferrer" className="px-1 py-2 text-[13px] font-normal text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors tracking-tight inline-flex items-center gap-1">
              Портфолио
              <iconify-icon icon="solar:arrow-right-up-linear" className="text-xs"></iconify-icon>
            </a>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded border border-[color:var(--border)] bg-[color:var(--bg-card)] hover:bg-[color:var(--bg-card-hover)] transition-colors"
              aria-label="Меню"
            >
              <iconify-icon icon="solar:hamburger-menu-linear" className="text-[color:var(--text)] text-lg"></iconify-icon>
            </button>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:block text-[13px] font-normal text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
            >
              WhatsApp
            </a>
            <a
              href="#quote"
              className="text-xs px-5 py-2.5 bg-[color:var(--text)] text-[color:var(--bg-main)] font-semibold rounded tracking-tight transition-all duration-300 hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            >
              Получить аудит
            </a>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-50 bg-[color:var(--bg-main)]/95 backdrop-blur-xl ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        } transition-transform duration-300 md:hidden flex flex-col items-center justify-center gap-8`}
      >
        <button
          onClick={() => setMenuOpen(false)}
          className="absolute top-4 right-4 p-2 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
          aria-label="Закрыть"
        >
          <iconify-icon icon="solar:close-circle-linear" className="text-3xl"></iconify-icon>
        </button>
        {[
          ['#services', 'Услуги'],
          ['#process', 'Процесс'],
          ['#pricing', 'Тарифы'],
          ['#outcomes', 'Результаты'],
          ['#stack', 'Стек'],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            className="text-2xl font-display uppercase tracking-tight text-[color:var(--text)] hover:text-[color:var(--accent)] transition-colors"
          >
            {label}
          </a>
        ))}
        <a
          href={PORTFOLIO_LINK}
          target="_blank"
          rel="noreferrer"
          onClick={() => setMenuOpen(false)}
          className="text-2xl font-display uppercase tracking-tight text-[color:var(--text-muted)] hover:text-[color:var(--accent)] transition-colors inline-flex items-center gap-2"
        >
          Портфолио
          <iconify-icon icon="solar:arrow-right-up-linear" className="text-lg"></iconify-icon>
        </a>
        <a
          href="#quote"
          onClick={() => setMenuOpen(false)}
          className="text-xl font-medium text-white bg-[color:var(--accent)] px-8 py-3 rounded mt-4"
        >
          Получить аудит
        </a>
      </div>

      {/* HERO */}
      <main
        id="home"
        className="section section--main overflow-hidden min-h-screen flex flex-col sm:px-6 sm:pt-40 sm:pb-24 z-10 pt-36 px-4 pb-24 relative"
      >
        <div className="mx-auto text-center relative max-w-7xl flex-1 flex flex-col items-center w-full">
          <div className="absolute -top-20 sm:-top-32 left-1/2 -translate-x-1/2 w-[90vw] sm:w-[600px] h-[200px] sm:h-[300px] blur-[100px] rounded-full pointer-events-none bg-[color:var(--accent)]/20 mix-blend-screen"></div>

          <div className="relative z-10 flex flex-col items-center w-full max-w-5xl">
            <div className="flex items-center gap-3 mb-6 hero-fade">
              <div className="w-1 h-1 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent)]"></div>
              <span className="text-[10px] sm:text-[11px] font-mono font-medium uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
                AI-Студия в Казахстане
              </span>
              <div className="w-1 h-1 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent)]"></div>
            </div>

            <h1 className="hero-fade hero-text-shadow sm:text-7xl md:text-8xl uppercase leading-[0.9] text-5xl font-medium text-[color:var(--text)] tracking-tighter font-display mb-6 drop-shadow-2xl">
              Точные AI-системы
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--accent)] to-white font-semibold glow-text">
                Без компромиссов.
              </span>
            </h1>
            <p className="hero-fade hero-text-shadow text-[color:var(--text-muted)] text-lg sm:text-xl font-normal tracking-tight mb-8 leading-tight max-w-2xl">
              Внедряем AI-ботов, лендинги и таргет, которые превращают сообщения в WhatsApp в реальные деньги. Под бизнес в Казахстане — от салона до сети клиник.
            </p>

            <div className="hero-fade flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto px-4 mb-16">
              <a
                href="#quote"
                className="flex items-center justify-center w-full sm:w-auto px-8 py-3 bg-[color:var(--accent)] text-white text-sm font-semibold rounded tracking-tight transition-all duration-300 hover:bg-[color:var(--accent-hover)] shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] border border-[color:var(--accent)]"
              >
                Получить бесплатный аудит
              </a>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3 bg-transparent text-[color:var(--text)] border border-[color:var(--border)] hover:bg-[color:var(--bg-card)] text-sm font-medium rounded transition-all flex items-center justify-center gap-2 hover:border-[color:var(--text-subtle)]"
              >
                <iconify-icon icon="logos:whatsapp-icon" className="text-base"></iconify-icon>
                Написать в WhatsApp
              </a>
              <a
                href={PORTFOLIO_LINK}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3 bg-transparent text-[color:var(--text-muted)] border border-[color:var(--border)] hover:bg-[color:var(--bg-card)] text-sm font-medium rounded transition-all flex items-center justify-center gap-2 hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              >
                Портфолио
                <iconify-icon icon="solar:arrow-right-up-linear" className="text-base"></iconify-icon>
              </a>
            </div>

            {/* Hero terminal panel */}
            <div className="hero-fade w-full max-w-4xl mx-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-card)]/50 backdrop-blur-xl shadow-[var(--shadow)] overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)] bg-[color:var(--bg-card)]/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#333] border border-[#444]"></div>
                    <div className="w-2 h-2 rounded-full bg-[#333] border border-[#444]"></div>
                    <div className="w-2 h-2 rounded-full bg-[#333] border border-[#444]"></div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--text-subtle)] ml-2">
                    chsh.studio :: deploy
                  </span>
                </div>
                <div className="flex bg-[color:var(--bg-surface)] rounded p-1 border border-[color:var(--border)]">
                  <button
                    onClick={() => setHeroPanel('input')}
                    className={`px-4 py-1 text-[10px] font-mono uppercase tracking-wider font-medium rounded transition-all ${
                      heroPanel === 'input'
                        ? 'bg-[color:var(--bg-card)] text-[color:var(--text)] border border-[color:var(--border)] shadow-sm'
                        : 'text-[color:var(--text-subtle)] hover:text-[color:var(--text)] border border-transparent'
                    }`}
                  >
                    Бот
                  </button>
                  <button
                    onClick={() => setHeroPanel('output')}
                    className={`px-4 py-1 text-[10px] font-mono uppercase tracking-wider font-medium rounded transition-all ${
                      heroPanel === 'output'
                        ? 'bg-[color:var(--bg-card)] text-[color:var(--text)] border border-[color:var(--border)] shadow-sm'
                        : 'text-[color:var(--text-subtle)] hover:text-[color:var(--text)] border border-transparent'
                    }`}
                  >
                    Метрики
                  </button>
                </div>
              </div>
              <div className="relative h-[340px] bg-[color:var(--bg-card)]/40">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none"></div>

                {/* Bot config view */}
                <div
                  className={`absolute inset-0 p-6 sm:p-10 transition-all duration-500 z-10 flex flex-col justify-center ${
                    heroPanel === 'input' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                >
                  <div className="font-mono text-xs sm:text-sm leading-loose text-[color:var(--text-muted)]">
                    <div className="flex gap-3">
                      <span className="text-[color:var(--accent)]">const</span>
                      <span className="text-[color:var(--text)]">Bot</span>
                      = {'{'}
                    </div>
                    <div className="pl-6"><span className="text-[color:var(--text)]">client</span>: <span className="text-[color:var(--text-subtle)]">'ДентаЛюкс / Астана'</span>,</div>
                    <div className="pl-6"><span className="text-[color:var(--text)]">channel</span>: <span className="text-[color:var(--accent)]">"WhatsApp Business"</span>,</div>
                    <div className="pl-6"><span className="text-[color:var(--text)]">model</span>: <span className="text-[color:var(--text-subtle)]">"gpt-4o-mini"</span>,</div>
                    <div className="pl-6"><span className="text-[color:var(--text)]">crm</span>: <span className="text-[color:var(--text-subtle)]">"AmoCRM"</span>,</div>
                    <div className="pl-6"><span className="text-[color:var(--text)]">stack</span>: {'{'}</div>
                    <div className="pl-12"><span className="text-[color:var(--text)]">first_response</span>: <span className="text-[color:var(--accent)]">"30s"</span>,</div>
                    <div className="pl-12"><span className="text-[color:var(--text)]">languages</span>: <span className="text-[color:var(--text-subtle)]">["RU", "KZ"]</span></div>
                    <div className="pl-6">{'}'}</div>
                    <div>{'};'}</div>
                  </div>
                  <div className="absolute bottom-6 right-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
                    <span className="text-[10px] font-mono text-[color:var(--text-subtle)] uppercase tracking-widest">
                      Bot Online
                    </span>
                  </div>
                </div>

                {/* Metrics view */}
                <div
                  className={`absolute inset-0 transition-all duration-500 flex items-center justify-center ${
                    heroPanel === 'output' ? 'opacity-100 z-10' : 'opacity-0 translate-y-4 pointer-events-none z-0'
                  }`}
                >
                  <div className={`w-full max-w-sm bg-[#050505] border border-[color:var(--border)] rounded-lg p-6 shadow-2xl relative overflow-hidden transition-all duration-500 ${
                    heroPanel === 'output' ? 'scale-100' : 'scale-95'
                  }`}>
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[color:var(--accent)] to-transparent"></div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[color:var(--bg-surface)] flex items-center justify-center border border-[color:var(--border)]">
                          <iconify-icon icon="solar:chart-2-bold" className="text-[color:var(--text)] text-sm"></iconify-icon>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-[color:var(--text)] uppercase tracking-wide">
                            Дашборд клиента
                          </h4>
                          <p className="text-[10px] text-[color:var(--text-subtle)]">
                            Месяц 1 · в проде
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded border border-[#10b981]/20 shadow-[0_0_10px_-2px_rgba(16,185,129,0.3)]">
                        Active
                      </span>
                    </div>
                    <div className="space-y-3 mb-6 font-mono text-[10px]">
                      <div className="flex justify-between items-center py-2 border-b border-[color:var(--border)]">
                        <span className="text-[color:var(--text-subtle)]">Заявок обработано</span>
                        <span className="text-[color:var(--text)]">247</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[color:var(--border)]">
                        <span className="text-[color:var(--text-subtle)]">Средний ответ</span>
                        <span className="text-[color:var(--text)]">31 сек</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[color:var(--border)]">
                        <span className="text-[color:var(--text-subtle)]">Конверсия</span>
                        <span className="text-[color:var(--text)] flex items-center gap-1">
                          <iconify-icon icon="solar:graph-up-bold" className="text-[color:var(--accent)]"></iconify-icon>
                          18%
                        </span>
                      </div>
                    </div>
                    <button className="w-full py-2 bg-[color:var(--bg-surface)] text-[color:var(--text)] text-[10px] font-semibold uppercase tracking-widest rounded hover:bg-[color:var(--border)] transition-colors border border-[color:var(--border)]">
                      Открыть отчёт
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="surface-seam"></div>
      </main>

      {/* PROCESS / WORKFLOW */}
      <section id="process" className="section section--surface py-24 md:py-32">
        <div className="spotlight"></div>
        <div className="section-content max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="relative z-10 animate-on-scroll">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--accent)] mb-3 block">
                Процесс работы
              </span>
              <h2 className="text-3xl md:text-5xl font-display text-[color:var(--text)] uppercase tracking-tighter leading-none mb-4 font-medium">
                Аудит
                <br />
                <span className="font-semibold text-[color:var(--accent)]">→ <span className="text-white">Запуск</span></span>
              </h2>
              <p className="text-[color:var(--text-muted)] text-sm font-light leading-relaxed mb-12 max-w-md">
                От первого звонка до бота в проде — 14 рабочих дней. Прозрачно, по этапам, с KPI на каждом шаге.
              </p>

              <div className="relative flex flex-col gap-0">
                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-[color:var(--border)]"></div>
                <div
                  className="absolute left-0 top-0 w-[2px] bg-[color:var(--accent)] shadow-[0_0_10px_var(--accent)] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                  style={{ height: '33.33%', top: `${activePipeline * 33.33}%` }}
                ></div>

                {[
                  { title: 'Аудит и план', tag: 'START', desc: 'Анализируем процессы, лиды, текущие воронки. Готовим карту внедрения и KPI на 90 дней.' },
                  { title: 'Разработка и тесты', tag: 'BUILD', desc: 'Промпты под нишу, интеграции с CRM/WhatsApp. Тестируем на ваших реальных диалогах до запуска в прод.' },
                  { title: 'Запуск и поддержка', tag: 'SCALE', desc: '3 месяца сопровождения: дообучение, оптимизация скриптов, отчёты по метрикам каждую неделю.' },
                ].map((step, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePipeline(i as 0 | 1 | 2)}
                    className="text-left pl-8 py-6 relative transition-all duration-300 outline-none focus:outline-none"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <h3
                        className={`text-lg font-semibold transition-colors ${
                          activePipeline === i ? 'text-[color:var(--text)]' : 'text-[color:var(--text-subtle)] hover:text-[color:var(--text)]'
                        }`}
                      >
                        {step.title.toUpperCase()}
                      </h3>
                      <span
                        className={`font-mono text-[9px] px-1.5 py-0.5 rounded border border-[color:var(--border)] transition-all ${
                          activePipeline === i
                            ? 'text-[color:var(--accent)] bg-[color:var(--accent-soft)]'
                            : 'text-[color:var(--text-subtle)] bg-[color:var(--bg-card)]'
                        }`}
                      >
                        {step.tag}
                      </span>
                    </div>
                    <p
                      className={`text-sm font-light leading-relaxed max-w-sm transition-colors ${
                        activePipeline === i ? 'text-[color:var(--text-muted)]' : 'text-[color:var(--text-subtle)] hover:text-[color:var(--text-muted)]'
                      }`}
                    >
                      {step.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel: pipeline visual */}
            <div className="relative w-full aspect-square md:aspect-[4/3] lg:aspect-square bg-[color:var(--bg-card)] rounded-2xl border border-[color:var(--border)] overflow-hidden shadow-[var(--shadow)] flex flex-col animate-on-scroll">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)] bg-[color:var(--bg-card)]/70 backdrop-blur-md z-20">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[color:var(--bg-surface)] border border-[color:var(--border)]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[color:var(--bg-surface)] border border-[color:var(--border)]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[color:var(--bg-surface)] border border-[color:var(--border)]"></div>
                </div>
                <span className="text-[10px] font-mono text-[color:var(--text-subtle)] uppercase tracking-widest">
                  status :: building
                </span>
                <div className="text-[9px] font-mono font-semibold text-[color:var(--accent)] bg-[color:var(--accent-soft)] px-2 py-1 rounded border border-[color:var(--border)] transition-all duration-300">
                  {['START', 'BUILD', 'SCALE'][activePipeline]}::ACTIVE
                </div>
              </div>

              <div className="relative flex-1 w-full bg-[#050505]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none"></div>

                {/* STEP 0 — AUDIT */}
                <div
                  className={`absolute inset-0 p-8 flex flex-col transition-all duration-500 ${
                    activePipeline === 0 ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 -translate-x-4 pointer-events-none z-0'
                  }`}
                >
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-[color:var(--border)]">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]"></div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--text)]">
                        Аудит ниши
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[color:var(--text-subtle)]">Шаг 01</span>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] uppercase tracking-widest text-[color:var(--text-subtle)] mb-1">Документы</span>
                      <div className="px-3 py-2 rounded border border-[color:var(--border)] bg-[color:var(--bg-card)] text-[10px] text-[color:var(--text-muted)] font-mono border-l-2 border-l-[color:var(--accent)] shadow-[var(--shadow)]">
                        Бриф и цели
                      </div>
                      <div className="px-3 py-2 rounded border border-[color:var(--border)] bg-[color:var(--bg-card)] text-[10px] text-[color:var(--text-muted)] font-mono">
                        Аудит воронки
                      </div>
                      <div className="px-3 py-2 rounded border border-[color:var(--border)] bg-[color:var(--bg-card)] text-[10px] text-[color:var(--text-muted)] font-mono">
                        Карта KPI
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 relative pl-4 border-l border-[color:var(--border)] border-dashed">
                      <span className="text-[9px] uppercase tracking-widest text-[color:var(--text-subtle)] mb-1">План</span>
                      {['Сегменты найдены', 'Каналы выбраны', 'KPI согласован'].map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[color:var(--bg-surface)] text-[9px] flex items-center justify-center text-[color:var(--text)] border border-[color:var(--border)]">{i + 1}</div>
                          <span className="text-[10px] text-[color:var(--text)]">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-[color:var(--border)]">
                    <span className="text-[9px] uppercase tracking-widest text-[color:var(--text-subtle)] mb-2 block">Статус</span>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 rounded bg-[color:var(--accent-soft)] border border-[color:var(--border)] text-[9px] text-[color:var(--accent)] font-mono flex items-center gap-1.5">
                        <iconify-icon icon="solar:check-circle-bold" className="text-xs"></iconify-icon>
                        Готов к разработке
                      </span>
                    </div>
                  </div>
                </div>

                {/* STEP 1 — BUILD */}
                <div
                  className={`absolute inset-0 p-8 flex flex-col transition-all duration-500 ${
                    activePipeline === 1 ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 pointer-events-none z-0'
                  }`}
                >
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-[color:var(--border)]">
                    <div className="flex items-center gap-2">
                      <iconify-icon icon="solar:code-square-bold" className="text-[color:var(--text)]"></iconify-icon>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--text)]">В разработке</span>
                    </div>
                    <span className="text-[10px] font-mono text-[color:var(--text-subtle)]">Шаг 02</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center relative my-2">
                    <div className="w-full bg-[color:var(--bg-card)] border border-[color:var(--border)] rounded-xl p-5 relative z-10 shadow-[var(--shadow)] flex flex-col gap-3">
                      <div className="absolute inset-0 bg-[color:var(--accent-soft)] rounded-xl pointer-events-none opacity-60"></div>
                      <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-2 mb-1 relative z-10">
                        <span className="text-[9px] uppercase tracking-wider text-[color:var(--accent)]">AI-стек</span>
                        <iconify-icon icon="solar:atom-bold" className="text-[color:var(--accent)] text-xs"></iconify-icon>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[color:var(--text)] relative z-10">
                        <iconify-icon icon="solar:speedometer-low-linear" className="text-[color:var(--text-subtle)]"></iconify-icon>
                        Модель: GPT-4o (быстрая)
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[color:var(--text)] relative z-10">
                        <iconify-icon icon="solar:link-bold" className="text-[color:var(--text-subtle)]"></iconify-icon>
                        Интеграции: WhatsApp, AmoCRM
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[color:var(--text)] relative z-10">
                        <iconify-icon icon="solar:test-tube-bold" className="text-[color:var(--text-subtle)]"></iconify-icon>
                        Тесты: 142 диалога / 98% pass
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-[color:var(--border)] flex items-center justify-between">
                    <div className="flex gap-1">
                      <div className="h-1 w-6 rounded-full bg-[color:var(--accent)] opacity-70"></div>
                      <div className="h-1 w-6 rounded-full bg-[color:var(--accent)] opacity-70"></div>
                    </div>
                    <div className="text-[9px] font-mono text-[color:var(--accent)] uppercase tracking-wide flex items-center gap-2">
                      <span>Сборка идёт</span>
                      <span className="w-1 h-1 rounded-full bg-[color:var(--accent)] shadow-[0_0_5px_var(--accent)]"></span>
                    </div>
                  </div>
                </div>

                {/* STEP 2 — SCALE */}
                <div
                  className={`absolute inset-0 p-8 flex flex-col transition-all duration-500 ${
                    activePipeline === 2 ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-8 pointer-events-none z-0'
                  }`}
                >
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-[color:var(--border)]">
                    <div className="flex items-center gap-2">
                      <iconify-icon icon="solar:rocket-bold-duotone" className="text-[color:var(--text)]"></iconify-icon>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--text)]">В проде</span>
                    </div>
                    <span className="text-[10px] font-mono text-[color:var(--text-subtle)]">Шаг 03</span>
                  </div>
                  <div className="flex-1 flex flex-col gap-5">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-[color:var(--text-subtle)] mb-2 block">Документы</span>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-[color:var(--accent-soft)] border border-[color:var(--border)] p-2.5 rounded text-center shadow-[var(--shadow)]">
                          <iconify-icon icon="solar:file-check-linear" className="text-[color:var(--text)] text-sm"></iconify-icon>
                          <span className="text-[10px] text-[color:var(--text)] font-semibold block mt-1">Акт сдачи</span>
                        </div>
                        <div className="flex-1 bg-[color:var(--bg-card)] border border-[color:var(--border)] p-2.5 rounded text-center opacity-80">
                          <iconify-icon icon="solar:bill-check-linear" className="text-[color:var(--text-muted)] text-sm"></iconify-icon>
                          <span className="text-[10px] text-[color:var(--text-muted)] block mt-1">Отчёт</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-[color:var(--text-subtle)] mb-2 block">Чеклист</span>
                      <div className="space-y-2.5 bg-[color:var(--bg-card)] p-3 rounded border border-[color:var(--border)]">
                        {['Бот в проде', 'Метрики собираются', 'Дообучение каждую неделю'].map((t) => (
                          <div key={t} className="flex items-center gap-2 text-[10px] text-[color:var(--text-muted)]">
                            <iconify-icon icon="solar:check-square-bold" className="text-[color:var(--accent)]"></iconify-icon>
                            {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-[color:var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-[color:var(--text)] uppercase tracking-wide">Прогресс</span>
                      <span className="flex items-center gap-1 text-[9px] text-[color:var(--text)] bg-[#10b981]/10 px-1.5 py-0.5 rounded border border-[#10b981]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                        Завершено
                      </span>
                    </div>
                    <div className="h-1 w-full bg-[color:var(--bg-surface)] rounded-full overflow-hidden border border-[color:var(--border)]">
                      <div className="h-full bg-[color:var(--accent)] w-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="surface-seam"></div>
      </section>

      {/* SERVICES / INDUSTRY */}
      <section id="services" className="section section--main py-28 md:py-36">
        <div className="spotlight"></div>
        <div className="section-content max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16 md:mb-20 animate-on-scroll">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-1 h-1 rounded-full bg-[color:var(--accent)]"></div>
              <span className="text-[11px] font-medium font-mono uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
                AI-возможности
              </span>
              <div className="w-1 h-1 rounded-full bg-[color:var(--accent)]"></div>
            </div>
            <h2 className="text-4xl md:text-6xl font-display text-[color:var(--text)] uppercase tracking-tighter leading-[0.95] mb-6 font-medium">
              Заточено под
              <span className="text-[color:var(--accent)] font-semibold"> → нишу</span>
            </h2>
            <p className="text-base text-[color:var(--text-muted)] leading-relaxed font-light mb-8 max-w-2xl mx-auto">
              chsh studio — не агентство «всё по 50К». Мы строим инженерные AI-системы под ваш конкретный бизнес: от стоматологии в Астане до сети салонов в Алматы.
            </p>
            <div className="flex flex-col items-center gap-6">
              <p className="text-xs text-[color:var(--text-subtle)] font-medium tracking-widest uppercase">
                Стек под каждый канал и каждый процесс
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['AI-боты', 'Лендинги', 'Таргет', 'AI-видео', 'AI-контент', 'Комплекс'].map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded border border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[10px] text-[color:var(--text-subtle)] font-mono uppercase tracking-wide">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 md:mb-20">
            {[
              {
                tag: 'Бьюти и услуги',
                num: '01',
                title: 'AI для салонов и клиник',
                desc: 'Стоматология, салоны красоты, фитнес, спа. Бот отвечает за 30 секунд, ведёт в запись, не теряет лидов.',
                cta: 'Узнать про бот',
              },
              {
                tag: 'Еда и HoReCa',
                num: '02',
                title: 'AI для ресторанов',
                desc: 'Рестораны, кафе, доставка. Приём заказов в WhatsApp, рекомендации блюд, обработка отзывов 24/7.',
                cta: 'Посмотреть стек',
              },
              {
                tag: 'Образование',
                num: '03',
                title: 'AI для курсов и школ',
                desc: 'Языковые школы, репетиторы, детские центры. Квалификация лидов, расписание, напоминания родителям.',
                cta: 'Узнать сроки',
              },
            ].map((card, i) => (
              <div
                key={card.tag}
                className="group relative flex flex-col p-8 rounded-2xl bg-[color:var(--bg-card)] border border-[color:var(--border)] shadow-[var(--shadow)] hover:bg-[color:var(--bg-card-hover)] transition-all duration-300 h-full overflow-hidden animate-on-scroll hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
              >
                {i === 0 && (
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--accent)]/40 to-transparent opacity-60"></div>
                )}
                <div className="flex justify-between items-start mb-6">
                  <span className={`text-[10px] font-mono font-semibold uppercase tracking-widest ${i === 0 ? 'text-[color:var(--text)] border-b border-[color:var(--accent)]/30 pb-0.5' : 'text-[color:var(--text-subtle)] group-hover:text-[color:var(--text)] transition-colors'}`}>
                    {card.tag}
                  </span>
                  <span className="text-[10px] font-mono text-[color:var(--text-subtle)]">{card.num}</span>
                </div>
                <h3 className="text-xl text-[color:var(--text)] font-display uppercase tracking-tight mb-3">{card.title}</h3>
                <p className="text-sm text-[color:var(--text-muted)] font-light leading-relaxed mb-8 flex-1">{card.desc}</p>
                <div className="mt-auto">
                  <a href="#quote" className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--accent)] hover:underline transition-colors">
                    {card.cta}
                    <iconify-icon icon="solar:arrow-right-linear" className="text-sm"></iconify-icon>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Mini features bar */}
          <div className="border-y border-[color:var(--border)] bg-[color:var(--bg-surface)]/30 mb-20 animate-on-scroll">
            <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-12">
              {[
                { num: '01', title: 'Промпт-инжиниринг', desc: 'Кастомные промпты под нишу' },
                { num: '02', title: 'KZ-локализация', desc: 'Kaspi, RU/KZ, локальные ниши' },
                { num: '03', title: 'Безопасность', desc: 'API-ключи в Vault, логи зашифрованы' },
              ].flatMap((f, i, arr) => [
                <div key={f.num} className="flex gap-4 items-start">
                  <span className="font-mono text-[10px] text-[color:var(--text-subtle)] border border-[color:var(--border)] bg-[color:var(--bg-card)] px-1.5 py-0.5 rounded">
                    {f.num}
                  </span>
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text)] mb-1">{f.title}</h4>
                    <p className="text-[11px] text-[color:var(--text-muted)] font-light">{f.desc}</p>
                  </div>
                </div>,
                i < arr.length - 1 ? (
                  <div key={`sep-${f.num}`} className="hidden md:block w-px h-8 bg-[color:var(--border)]"></div>
                ) : null,
              ])}
            </div>
          </div>

          {/* Two perspectives */}
          <div className="text-center mb-12">
            <p className="text-xs font-mono text-[color:var(--text-subtle)] uppercase tracking-widest">
              Два взгляда: что видим мы vs что видит клиент.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-[color:var(--border)] rounded-2xl overflow-hidden bg-[color:var(--bg-card)] shadow-[var(--shadow)] animate-on-scroll">
            <div className="p-8 lg:p-12 relative flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[color:var(--border)]">
              <div className="absolute top-6 left-6 z-10">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--accent)] border border-[color:var(--border)] px-2 py-1 rounded bg-[color:var(--accent-soft)]">
                  Studio View
                </span>
              </div>
              <div className="mt-12 space-y-4 mb-16">
                <div className="font-mono text-xs text-[color:var(--text-subtle)] leading-loose">
                  <div className="flex gap-4">
                    <span className="text-[color:var(--accent)]">BotID</span>
                    <span className="text-[color:var(--text)]">#chsh.dental.lux</span> = {'{'}
                  </div>
                  <div className="flex gap-4 pl-4"><span className="text-[color:var(--text)]">model</span>: <span className="text-[color:var(--text-subtle)]">'gpt-4o-mini'</span>,</div>
                  <div className="flex gap-4 pl-4"><span className="text-[color:var(--text)]">prompt_v</span>: <span className="text-[color:var(--accent)]">'v3.2'</span>,</div>
                  <div className="flex gap-4 pl-4"><span className="text-[color:var(--text)]">conversion</span>: <span className="text-[color:var(--text-subtle)]">'18%'</span>,</div>
                  <div className="flex gap-4 pl-4"><span className="text-[color:var(--text)]">avg_response</span>: <span className="text-[color:var(--accent)]">'31s'</span>,</div>
                  <div className="flex gap-4 pl-4"><span className="text-[color:var(--text)]">crm</span>: <span className="text-[color:var(--text-subtle)]">[AmoCRM, Wazzup]</span></div>
                  <div>{'};'}</div>
                </div>
              </div>
              <div>
                <h3 className="text-xl text-[color:var(--text)] font-display uppercase tracking-tight mb-2">Инженерный контроль</h3>
                <p className="text-sm text-[color:var(--text-muted)] leading-relaxed max-w-sm">
                  Мы держим всё под капотом: промпты, интеграции, метрики, логи. Чтобы вам не приходилось разбираться.
                </p>
              </div>
            </div>
            <div className="p-8 lg:p-12 relative bg-[color:var(--bg-surface)] flex flex-col justify-between">
              <div className="absolute top-6 left-6 z-10">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--text-subtle)] border border-[color:var(--border)] px-2 py-1 rounded bg-[color:var(--bg-card)]">
                  Client View
                </span>
              </div>
              <div className="mt-12 mb-16 relative flex justify-center items-center">
                <div className="bg-[color:var(--bg-card)] border border-[color:var(--border)] rounded-lg shadow-[var(--shadow)] w-full max-w-xs overflow-hidden">
                  <div className="h-8 bg-[color:var(--bg-surface)] border-b border-[color:var(--border)] flex items-center px-3 justify-between">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--border)]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--border)]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--border)]"></div>
                    </div>
                    <div className="h-1 w-8 bg-[color:var(--border)] rounded-full"></div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <iconify-icon icon="solar:chat-round-dots-bold" className="text-[color:var(--accent)] text-xl"></iconify-icon>
                      <div>
                        <div className="text-xs font-semibold text-[color:var(--text)]">Ваш AI-бот</div>
                        <div className="text-[10px] text-[color:var(--text-subtle)]">Активен с 12 февраля</div>
                      </div>
                    </div>
                    <div className="w-full h-px bg-[color:var(--border)]"></div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-[color:var(--text-subtle)]">Заявок: 247 · Конверсия: 18%</span>
                      <span className="text-[#10b981] font-semibold">+18%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl text-[color:var(--text)] font-display uppercase tracking-tight mb-2">Простые цифры</h3>
                <p className="text-sm text-[color:var(--text-muted)] leading-relaxed max-w-sm">
                  Вы видите то, что важно: сколько заявок, какая конверсия, средний чек. Без терминов и таблиц.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-16 text-center">
            <p className="text-[10px] font-mono text-[color:var(--text-subtle)] uppercase tracking-[0.2em] opacity-90">
              Один партнёр. От аудита до проды.
            </p>
          </div>
        </div>
        <div className="surface-seam"></div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="section section--surface py-24 md:py-32 relative">
        <div className="spotlight"></div>
        <div className="section-content max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-14 animate-on-scroll">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--text-subtle)] mb-3 block">// Прозрачные цены</span>
            <h2 className="text-3xl md:text-5xl font-display font-medium text-[color:var(--text)] uppercase tracking-tighter leading-[0.95] mb-5">
              Тарифы
              <span className="text-[color:var(--accent)] font-semibold"> → без скрытых</span>
            </h2>
            <p className="text-sm text-[color:var(--text-muted)] leading-relaxed font-light">
              Базовые пакеты. Финальная цена фиксируется после бесплатного аудита — не дороже указанного, иногда дешевле.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                tag: 'BOT',
                num: '01',
                title: 'AI-ассистент',
                price: 'от 250 000 ₸',
                period: '/проект',
                desc: '1 канал (WhatsApp / Direct), интеграция с CRM, кастомный промпт под нишу, обучение.',
                bullets: ['Запуск 7-14 дней', 'Поддержка 3 мес. в подарок', 'Интеграция с amoCRM / Bitrix'],
                accent: false,
              },
              {
                tag: 'SITE',
                num: '02',
                title: 'Лендинг + воронка',
                price: 'от 450 000 ₸',
                period: '/проект',
                desc: 'Конверсионный сайт под одну услугу или нишу + аналитика + A/B тесты.',
                bullets: ['Дизайн под бренд', 'Hot-форма → TG / CRM', 'Метрика + Tag Manager'],
                accent: false,
              },
              {
                tag: 'VIRAL',
                num: '03',
                title: 'AI-контент + UGC',
                price: 'от $30',
                period: '/30 сек видео',
                desc: 'Виральные ролики с AI для рекламы. UGC-аватары, говорящие на ru / kz. Reels, TikTok, посты — всё под ваш бренд.',
                bullets: ['UGC-аватар от $30 / 30 сек', '8-12 Reels/мес — пакет', 'Сценарии под алгоритмы'],
                accent: false,
              },
              {
                tag: 'ALL-IN',
                num: '04',
                title: 'Комплекс',
                price: 'от 1 500 000 ₸',
                period: '/проект',
                desc: 'Всё вместе: бот + лендинг + AI-контент + таргет. Для тех, кто хочет включить рост и забыть.',
                bullets: ['−15% при оплате сразу', 'Менеджер проекта 24/7', 'KPI-отчёт каждые 2 недели'],
                accent: true,
              },
            ].map((p) => (
              <div
                key={p.tag}
                className={`group relative flex flex-col p-7 rounded-2xl border transition-all duration-300 h-full overflow-hidden animate-on-scroll hover:scale-[1.02] ${
                  p.accent
                    ? 'bg-gradient-to-b from-[color:var(--accent)]/10 to-[color:var(--bg-card)] border-[color:var(--accent)]/40 shadow-[0_20px_60px_-20px_rgba(59,130,246,0.4)]'
                    : 'bg-[color:var(--bg-card)] border-[color:var(--border)] shadow-[var(--shadow)] hover:bg-[color:var(--bg-card-hover)]'
                }`}
              >
                {p.accent && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-[color:var(--accent)] text-[9px] font-mono uppercase tracking-widest text-white shadow-[0_0_12px_rgba(59,130,246,0.6)]">
                    Хит
                  </span>
                )}
                <div className="flex justify-between items-start mb-5">
                  <span className={`text-[10px] font-mono font-semibold uppercase tracking-widest ${p.accent ? 'text-[color:var(--accent)]' : 'text-[color:var(--text-subtle)]'}`}>
                    {p.tag}
                  </span>
                  <span className="text-[10px] font-mono text-[color:var(--text-subtle)]">{p.num}</span>
                </div>
                <h3 className="text-lg text-[color:var(--text)] font-display uppercase tracking-tight mb-2">{p.title}</h3>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className={`text-2xl font-display font-medium ${p.accent ? 'text-[color:var(--accent)] glow-text' : 'text-[color:var(--text)]'}`}>{p.price}</span>
                  <span className="text-[10px] font-mono text-[color:var(--text-subtle)] uppercase">{p.period}</span>
                </div>
                <p className="text-xs text-[color:var(--text-muted)] font-light leading-relaxed mb-5 flex-1">{p.desc}</p>
                <ul className="space-y-2 mb-6">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[11px] text-[color:var(--text-muted)] font-light leading-snug">
                      <iconify-icon icon="solar:check-circle-bold" className={`text-sm mt-px shrink-0 ${p.accent ? 'text-[color:var(--accent)]' : 'text-[color:var(--text-subtle)]'}`}></iconify-icon>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#quote"
                  className={`mt-auto inline-flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-widest py-2.5 rounded transition-all ${
                    p.accent
                      ? 'bg-[color:var(--accent)] text-white hover:shadow-[0_0_16px_rgba(59,130,246,0.5)]'
                      : 'bg-[color:var(--bg-main)] text-[color:var(--text)] border border-[color:var(--border)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]'
                  }`}
                >
                  Узнать точную цену
                  <iconify-icon icon="solar:arrow-right-linear" className="text-sm"></iconify-icon>
                </a>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-2.5">
              <iconify-icon icon="solar:shield-check-bold" className="text-base text-[color:var(--accent)]"></iconify-icon>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[color:var(--text-muted)]">Аудит бесплатный</span>
            </div>
            <span className="hidden sm:inline text-[color:var(--border)]">·</span>
            <div className="flex items-center gap-2.5">
              <iconify-icon icon="solar:dollar-bold" className="text-base text-[color:var(--accent)]"></iconify-icon>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[color:var(--text-muted)]">Оплата частями</span>
            </div>
            <span className="hidden sm:inline text-[color:var(--border)]">·</span>
            <div className="flex items-center gap-2.5">
              <iconify-icon icon="solar:medal-ribbon-bold" className="text-base text-[color:var(--accent)]"></iconify-icon>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[color:var(--text-muted)]">Гарантия по KPI</span>
            </div>
          </div>
        </div>
        <div className="surface-seam"></div>
      </section>

      {/* OUTCOMES */}
      <section id="outcomes" className="section section--surface py-24 md:py-32">
        <div className="spotlight"></div>
        <div className="section-content max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="max-w-2xl">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--text-subtle)] mb-3 block">// Почему chsh studio</span>
              <h2 className="text-3xl md:text-5xl font-display font-medium text-[color:var(--text)] uppercase tracking-tighter leading-none mb-4">
                Сервис
                <br />
                <span className="text-[color:var(--accent)] font-semibold">→ Результат</span>
              </h2>
              <p className="text-sm text-[color:var(--text-muted)] leading-relaxed font-light">
                Перевод бизнеса из режима «сюрпризов» в предсказуемые цифры. AI как инфраструктура — не игрушка.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden bg-[color:var(--border)] border border-[color:var(--border)] rounded-[2rem] shadow-[var(--shadow)] gap-px">
            {[
              { tag: '// СКОРОСТЬ', title: 'Ответ за 30 секунд', desc: 'AI отвечает в WhatsApp/Direct мгновенно. Без выходных, ночных смен и человеческих факторов.', flip: 'Тишина → Ответы', highlight: true },
              { tag: '// ЦЕНА', title: 'Прозрачная цена', desc: 'Фиксированная стоимость внедрения. Без скрытых часов, без "ой, это в смету не входило".', flip: 'Сюрпризы → Стабильность', highlight: true },
              { tag: '// КОНВЕРСИЯ', title: 'Воронка под контролем', desc: 'Скрипт прописан, протестирован на ваших диалогах, каждый лид проходит одинаковый путь.', flip: 'Хаос → Система', highlight: true },
              { tag: '// АНАЛИТИКА', title: 'Метрики в реальном времени', desc: 'Дашборд с конверсией, средним чеком и ROI. Решения принимаются на цифрах, не на интуиции.', flip: 'Слепо → Видимо' },
              { tag: '// ПОДДЕРЖКА', title: 'Один точкой контакта', desc: 'Прямая связь со мной в WhatsApp/TG. Без call-центров, без тикет-систем, без переключений менеджеров.', flip: 'Тикеты → Партнёр' },
              { tag: '// KZ-ФОКУС', title: 'Сделано под Казахстан', desc: 'Kaspi-платежи, языки RU/KZ, локальные ниши, понимание реальной экономики Алматы и Астаны.', flip: 'Шаблон → Локально' },
            ].map((c, i) => (
              <div
                key={i}
                className="group bg-[color:var(--bg-card)] hover:bg-[color:var(--bg-card-hover)] transition-colors p-8 flex flex-col justify-between h-full relative animate-on-scroll"
              >
                {c.highlight && (
                  <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--accent-soft)] to-transparent opacity-70 pointer-events-none"></div>
                )}
                {c.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--accent)]/45 to-transparent opacity-70"></div>
                )}
                <div className="absolute inset-0 border border-transparent group-hover:border-[color:var(--accent)]/15 transition-colors pointer-events-none"></div>
                <div className="relative z-10">
                  <span className={`font-mono text-[10px] uppercase tracking-widest mb-4 block ${c.highlight ? 'text-[color:var(--accent)]' : 'text-[color:var(--text-subtle)]'}`}>{c.tag}</span>
                  <h3 className="text-lg font-semibold text-[color:var(--text)] mb-2 tracking-tight">{c.title}</h3>
                  <p className="text-sm text-[color:var(--text-muted)] font-light leading-relaxed mb-8">{c.desc}</p>
                </div>
                <div className={`text-[10px] font-mono transition-colors flex items-center gap-2 relative z-10 ${c.highlight ? 'text-[color:var(--text-subtle)] group-hover:text-[color:var(--accent)]' : 'text-[color:var(--text-subtle)]'}`}>
                  {c.flip}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-[11px] font-mono text-[color:var(--text-subtle)] tracking-widest uppercase opacity-90">
              Инженерный подход. Премиум-исполнение.
            </p>
          </div>
        </div>
        <div className="surface-seam"></div>
      </section>

      {/* STACK / STANDARDS */}
      <section id="stack" className="section section--main py-32">
        <div className="spotlight"></div>
        <div className="section-content max-w-7xl mx-auto px-6">
          <div className="mb-20 max-w-4xl mx-auto text-center">
            <div className="flex items-center gap-3 mb-6 justify-center animate-on-scroll">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--text-subtle)]">stack :: standards</span>
              <div className="h-px w-8 bg-[color:var(--border)]"></div>
              <span className="text-[10px] font-mono text-[color:var(--text-subtle)]">Гарантии</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-medium text-[color:var(--text)] uppercase tracking-tighter leading-[0.9] mb-6 animate-on-scroll">
              Современный стек.
              <br />
              <span className="text-[color:var(--accent)] font-semibold">Проверенные результаты.</span>
            </h2>
            <p className="text-base text-[color:var(--text-muted)] font-light leading-relaxed mb-10 max-w-2xl mx-auto animate-on-scroll">
              Стабильность — не случайность. Это результат правильного стека, тестов на ваших данных и постоянного мониторинга метрик.
            </p>
            <div className="flex flex-wrap items-center gap-8 border-t border-[color:var(--border)] pt-6 justify-center animate-on-scroll">
              <div>
                <div className="text-lg font-semibold text-[color:var(--text)] tracking-tight">+18%</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--text-subtle)] mt-1">средний чек</div>
              </div>
              <div className="w-px h-8 bg-[color:var(--border)]"></div>
              <div>
                <div className="text-lg font-semibold text-[color:var(--text)] tracking-tight">24/7</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--text-subtle)] mt-1">ответы клиентам</div>
              </div>
              <div className="w-px h-8 bg-[color:var(--border)]"></div>
              <div>
                <div className="text-lg font-semibold text-[color:var(--text)] tracking-tight">14 дней</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--text-subtle)] mt-1">от старта до прода</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-on-scroll">
            {[
              { focus: 'AI-стек', icon: 'solar:atom-bold', title: 'Промпт-инжиниринг', desc: 'GPT-4o + кастомные промпты под нишу. Тестируем на ваших реальных диалогах до прода.', flip: 'Шаблон → Адаптив', highlight: false },
              { focus: 'Интеграции', icon: 'solar:link-bold', title: 'CRM + WhatsApp', desc: 'AmoCRM, Bitrix24, Wazzup, Salebot, GetCourse. Лиды и переписка в одном окне.', flip: 'Раздробленность → Сквозная', highlight: true },
              { focus: 'Данные', icon: 'solar:shield-check-bold', title: 'Безопасность', desc: 'API-ключи в Vault, логи зашифрованы, дата клиентов хранится в KZ-серверах.', flip: 'Риск → Контроль', highlight: false },
              { focus: 'Поддержка', icon: 'solar:users-group-rounded-bold', title: '3 мес. на запуске', desc: 'Дообучаем бота, оптимизируем сценарии, считаем ROI каждую неделю — вместе с вами.', flip: 'Реактив → Проактив', highlight: true },
            ].map((c) => (
              <div
                key={c.focus}
                className="group bg-[color:var(--bg-card)] border border-[color:var(--border)] p-6 rounded-2xl relative overflow-hidden hover:bg-[color:var(--bg-card-hover)] transition-all duration-300 shadow-[var(--shadow)]"
              >
                {c.highlight && (
                  <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--accent-soft)] to-transparent opacity-70 pointer-events-none"></div>
                )}
                <div className={`absolute top-0 right-0 p-5 ${c.highlight ? 'opacity-100' : 'opacity-20 group-hover:opacity-35 transition-opacity'}`}>
                  <iconify-icon icon={c.icon} className={`text-3xl ${c.highlight ? 'text-[color:var(--accent)]' : 'text-[color:var(--text-subtle)]'}`}></iconify-icon>
                </div>
                <span className={`text-[9px] font-mono uppercase tracking-widest block mb-4 border-b border-[color:var(--border)] pb-2 w-max relative z-10 ${c.highlight ? 'text-[color:var(--accent)]' : 'text-[color:var(--text-subtle)]'}`}>
                  Фокус: {c.focus}
                </span>
                <h3 className="text-base font-semibold text-[color:var(--text)] mb-2 relative z-10">{c.title}</h3>
                <p className="text-xs text-[color:var(--text-muted)] leading-relaxed mb-8 font-light relative z-10">{c.desc}</p>
                <div className="mt-auto flex justify-between items-end relative z-10">
                  <span className="text-[9px] font-mono text-[color:var(--text-muted)] bg-[color:var(--bg-surface)] px-1.5 py-0.5 rounded border border-[color:var(--border)]">
                    {c.flip}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 border-t border-[color:var(--border)] pt-8 text-center animate-on-scroll">
            <p className="text-[10px] font-mono text-[color:var(--text-subtle)] uppercase tracking-[0.2em]">
              Инфраструктура, которая двигает ваш бизнес.
            </p>
          </div>
        </div>
        <div className="surface-seam"></div>
      </section>

      {/* BOTTOM ZONE — form + footer share the horizon scene as background */}
      <div id="bottom-zone" className="relative overflow-hidden">
        <div className="footer-stage" aria-hidden="true">
          <UnicornScene
            projectId="QGDyBNEgLzAAdlivBo0x"
            width={`${Math.min(viewport.w, 1920)}px`}
            height="900px"
            scale={1}
            dpi={1.5}
            sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@2.1.11/dist/unicornStudio.umd.js"
          />
        </div>
        <div className="footer-stage-overlay" aria-hidden="true"></div>

      {/* CTA + FORM */}
      <section className="section pt-32 pb-32 relative" id="quote">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--accent),_transparent_90%)] opacity-[0.08] pointer-events-none z-0"></div>
        <div className="spotlight absolute top-[-20%] left-0 right-0 h-[600px] bg-[radial-gradient(800px_circle_at_top,_rgba(59,130,246,0.15),_transparent_70%)] pointer-events-none z-0"></div>
        <div className="section-content max-w-3xl mx-auto px-6 relative z-10">
          <div className="relative rounded-3xl border border-[color:var(--accent)]/30 bg-[color:var(--bg-card)]/80 backdrop-blur-xl p-8 md:p-14 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),_inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="absolute top-0 left-0 w-80 h-80 bg-[radial-gradient(circle_at_top_left,_var(--accent),_transparent_70%)] opacity-[0.1] pointer-events-none"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--accent)] to-transparent shadow-[0_0_15px_var(--accent)]"></div>

            <div className="text-center mb-8">
              <h2 className="text-4xl md:text-6xl font-display text-[color:var(--text)] mb-6 uppercase tracking-tighter leading-[0.95] font-medium relative z-10">
                Готовы
                <br />
                <span className="text-[color:var(--accent)] font-semibold glow-text">внедрить AI?</span>
              </h2>
              <p className="text-sm md:text-base text-[color:var(--text)]/80 mb-10 max-w-lg mx-auto leading-relaxed relative z-10">
                Бесплатный аудит и план внедрения за 48 часов. Расскажите про бизнес — пришлю карту: что внедрить, в каком порядке, с какой окупаемостью.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-10">
                {['Бесплатный аудит', 'Ответ за 24 часа', 'Без обязательств'].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent)]"></div>
                    <span className="text-[11px] text-[color:var(--text)] font-mono tracking-wide">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {!submitted ? (
              <form onSubmit={handleFormSubmit} className="space-y-4 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="Ваше имя"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-[color:var(--bg-main)] border border-[color:var(--border)] rounded-lg px-4 py-3.5 text-sm text-[color:var(--text)] placeholder-[color:var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30 focus:border-[color:var(--accent)] transition-all"
                  />
                  <input
                    id="phone"
                    type="tel"
                    required
                    placeholder="+7 700 000 00 00"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="w-full bg-[color:var(--bg-main)] border border-[color:var(--border)] rounded-lg px-4 py-3.5 text-sm text-[color:var(--text)] placeholder-[color:var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30 focus:border-[color:var(--accent)] transition-all font-mono"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    id="business"
                    type="text"
                    placeholder="Название бизнеса (необязательно)"
                    value={formData.business}
                    onChange={handleInputChange}
                    className="w-full bg-[color:var(--bg-main)] border border-[color:var(--border)] rounded-lg px-4 py-3.5 text-sm text-[color:var(--text)] placeholder-[color:var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30 focus:border-[color:var(--accent)] transition-all"
                  />
                  <select
                    id="niche"
                    value={formData.niche}
                    onChange={handleInputChange}
                    className="w-full bg-[color:var(--bg-main)] border border-[color:var(--border)] rounded-lg px-4 py-3.5 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30 focus:border-[color:var(--accent)] transition-all"
                  >
                    <option value="">Ниша бизнеса</option>
                    {NICHE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <select
                  id="service"
                  value={formData.service}
                  onChange={handleInputChange}
                  className="w-full bg-[color:var(--bg-main)] border border-[color:var(--border)] rounded-lg px-4 py-3.5 text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30 focus:border-[color:var(--accent)] transition-all"
                >
                  <option value="">Что нужно внедрить?</option>
                  {SERVICE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <textarea
                  id="message"
                  rows={3}
                  placeholder="Расскажите коротко про задачу (необязательно)"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full bg-[color:var(--bg-main)] border border-[color:var(--border)] rounded-lg px-4 py-3.5 text-sm text-[color:var(--text)] placeholder-[color:var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30 focus:border-[color:var(--accent)] transition-all resize-none"
                />

                {error && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-10 py-4 bg-[color:var(--accent)] text-white text-sm font-semibold rounded-lg tracking-tight shadow-[0_0_20px_-5px_rgba(59,130,246,0.4)] hover:bg-[color:var(--accent-hover)] hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.6)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      Отправляем...
                    </>
                  ) : (
                    <>
                      Отправить заявку
                      <iconify-icon icon="solar:arrow-right-linear" className="text-base"></iconify-icon>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-[color:var(--text-subtle)] text-center font-mono mt-4">
                  или напишите напрямую в{' '}
                  <a href={WA_LINK} target="_blank" rel="noreferrer" className="text-[color:var(--accent)] hover:underline">WhatsApp</a>
                  {' / '}
                  <a href={TG_LINK} target="_blank" rel="noreferrer" className="text-[color:var(--accent)] hover:underline">Telegram</a>
                </p>
              </form>
            ) : (
              <div className="text-center py-8 relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[color:var(--accent-soft)] border border-[color:var(--accent)]/30 flex items-center justify-center">
                  <iconify-icon icon="solar:check-circle-bold" className="text-[color:var(--accent)] text-3xl"></iconify-icon>
                </div>
                <h3 className="text-2xl font-display uppercase text-[color:var(--text)] mb-2">Заявка отправлена</h3>
                <p className="text-sm text-[color:var(--text-muted)] mb-6">
                  Свяжусь с вами в течение 24 часов в WhatsApp или Telegram. Готовлю аудит уже сейчас.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-xs text-[color:var(--accent)] hover:underline"
                >
                  Отправить ещё одну
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="relative border-t border-[color:var(--border)] pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-10 mb-10 w-full">
            <div className="flex flex-col items-center md:items-start gap-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--text-subtle)] opacity-70">Связаться</span>
              <div className="flex flex-col gap-2.5 text-center md:text-left">
                <a href={WA_LINK} target="_blank" rel="noreferrer" className="group flex items-center gap-2.5 text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors justify-center md:justify-start">
                  <iconify-icon icon="logos:whatsapp-icon" className="text-sm"></iconify-icon>
                  <span>+7 775 776 76 66</span>
                </a>
                <a href={TG_LINK} target="_blank" rel="noreferrer" className="group flex items-center gap-2.5 text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors justify-center md:justify-start">
                  <iconify-icon icon="logos:telegram" className="text-sm"></iconify-icon>
                  <span>@{TG_USERNAME}</span>
                </a>
                <a href={`mailto:${EMAIL}`} className="group flex items-center gap-2.5 text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors justify-center md:justify-start">
                  <iconify-icon icon="solar:letter-bold" className="text-sm text-[color:var(--text-subtle)]"></iconify-icon>
                  <span>{EMAIL}</span>
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--accent)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent)]"></span>
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--text)]">Studio Status: Active</span>
              </div>
              <div className="flex gap-3 text-[9px] font-mono text-[color:var(--text-subtle)] uppercase tracking-widest opacity-80">
                <span>Almaty / Astana</span>
                <span className="text-[color:var(--border)]">|</span>
                <span>KZ</span>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--text-subtle)] opacity-70">Студия</span>
              <div className="flex flex-col gap-2.5 text-center md:text-right">
                <a href="#services" className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--accent)] transition-colors">Услуги</a>
                <a href="#pricing" className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--accent)] transition-colors">Тарифы</a>
                <a href={PORTFOLIO_LINK} target="_blank" rel="noreferrer" className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--accent)] transition-colors inline-flex items-center justify-center md:justify-end gap-1">
                  Портфолио
                  <iconify-icon icon="solar:arrow-right-up-linear" className="text-[10px]"></iconify-icon>
                </a>
                <a href="#quote" className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--accent)] transition-colors">Связаться</a>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-[color:var(--border)] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10">
                <img src="/logo.png" alt="chsh studio" className="h-full w-auto object-contain block opacity-90" draggable={false} />
              </div>
              <span className="text-[10px] font-mono text-[color:var(--text-subtle)] uppercase tracking-widest">© 2025</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-[10px] font-mono text-[color:var(--text-subtle)] hover:text-[color:var(--text)] uppercase tracking-widest transition-colors">Политика</a>
              <a href="#" className="text-[10px] font-mono text-[color:var(--text-subtle)] hover:text-[color:var(--text)] uppercase tracking-widest transition-colors">Оферта</a>
            </div>
          </div>
        </div>
      </footer>
      </div>
      {/* /BOTTOM ZONE */}

      {/* Floating WhatsApp button */}
      <a
        href={WA_LINK}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20bd5a] shadow-[0_8px_30px_rgba(37,211,102,0.4)] hover:shadow-[0_8px_40px_rgba(37,211,102,0.6)] flex items-center justify-center transition-all hover:scale-110"
        aria-label="WhatsApp"
      >
        <iconify-icon icon="logos:whatsapp-icon" className="text-2xl"></iconify-icon>
      </a>
    </div>
  );
}
