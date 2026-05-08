// Lightweight analytics layer for chsh.online landing.
//
// All trackers are env-driven (Vite import.meta.env.VITE_*). If an ID is not
// set, the corresponding script is simply not loaded — nothing breaks. Set
// the IDs as Environment Variables in Vercel (Project Settings → Environment
// Variables) and the trackers come online on the next deploy.
//
// Supported:
//   VITE_YM_ID           — Yandex Metrika counter id (e.g. "100123456")
//   VITE_META_PIXEL_ID   — Meta (Facebook/Instagram) Pixel id (e.g. "123456789012345")
//   VITE_TIKTOK_PIXEL_ID — TikTok Pixel id
//   VITE_CLARITY_ID      — Microsoft Clarity project id (e.g. "abcdef1234")

declare global {
  interface Window {
    ym?: (counterId: number, action: string, ...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page: () => void;
      load: (id: string) => void;
      [k: string]: unknown;
    };
    clarity?: (...args: unknown[]) => void;
  }
}

const env = import.meta.env;
const YM_ID = (env.VITE_YM_ID as string | undefined)?.trim();
const META_PIXEL_ID = (env.VITE_META_PIXEL_ID as string | undefined)?.trim();
const TIKTOK_PIXEL_ID = (env.VITE_TIKTOK_PIXEL_ID as string | undefined)?.trim();
const CLARITY_ID = (env.VITE_CLARITY_ID as string | undefined)?.trim();

let initialized = false;

function injectInline(content: string) {
  const s = document.createElement('script');
  s.textContent = content;
  document.head.appendChild(s);
  return s;
}

function initYandexMetrika(id: string) {
  // Standard Metrika counter init (matches the official snippet, no <noscript>).
  injectInline(`
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    ym(${Number(id)}, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true, ecommerce: "dataLayer" });
  `);
}

function initMetaPixel(id: string) {
  injectInline(`
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${id}');
    fbq('track', 'PageView');
  `);
}

function initTikTokPixel(id: string) {
  injectInline(`
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
      ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
      ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;
      ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
      n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;
      e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
      ttq.load('${id}');
      ttq.page();
    }(window, document, 'ttq');
  `);
}

function initClarity(id: string) {
  injectInline(`
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${id}");
  `);
}

/** Initialize all trackers whose env vars are set. Idempotent. */
export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  if (YM_ID) initYandexMetrika(YM_ID);
  if (META_PIXEL_ID) initMetaPixel(META_PIXEL_ID);
  if (TIKTOK_PIXEL_ID) initTikTokPixel(TIKTOK_PIXEL_ID);
  if (CLARITY_ID) initClarity(CLARITY_ID);

  installClickDelegation();
}

/**
 * Single delegated click listener that fires goals based on link href so we
 * don't have to add `onClick` to every CTA in the markup. Recognises the
 * landing's three external-CTA categories: WhatsApp / Telegram / portfolio.
 */
function installClickDelegation() {
  document.addEventListener(
    'click',
    (ev) => {
      const target = (ev.target as HTMLElement | null)?.closest('a');
      if (!target) return;
      const href = target.getAttribute('href') || '';
      if (!href) return;

      if (href.startsWith('https://wa.me/') || href.includes('whatsapp.com/send')) {
        trackGoal('whatsapp_click');
      } else if (/^https?:\/\/t\.me\//.test(href)) {
        trackGoal('telegram_click');
      } else if (href.includes('oc-portfolio-olive.vercel.app')) {
        trackGoal('portfolio_click');
      }
    },
    { capture: true }
  );
}

/**
 * Fire a goal across all configured trackers. Used for `lead_submit`,
 * `whatsapp_click`, etc. Telegram lead-magnet flow can fire its own goals too.
 */
export function trackGoal(
  goal: string,
  params?: Record<string, unknown>
) {
  if (typeof window === 'undefined') return;

  if (YM_ID && window.ym) {
    try {
      window.ym(Number(YM_ID), 'reachGoal', goal, params);
    } catch (e) {
      console.warn('[analytics] YM goal failed', e);
    }
  }

  if (META_PIXEL_ID && window.fbq) {
    try {
      // Map our goal names to Meta standard events when possible; otherwise fire
      // a custom event so the pixel still records something useful.
      const standard: Record<string, string> = {
        lead_submit: 'Lead',
        whatsapp_click: 'Contact',
        telegram_click: 'Contact',
        portfolio_click: 'ViewContent',
        checklist_optin: 'CompleteRegistration',
      };
      const evt = standard[goal] || 'Lead';
      window.fbq('track', evt, params);
      window.fbq('trackCustom', goal, params);
    } catch (e) {
      console.warn('[analytics] FB pixel goal failed', e);
    }
  }

  if (TIKTOK_PIXEL_ID && window.ttq) {
    try {
      const standard: Record<string, string> = {
        lead_submit: 'SubmitForm',
        whatsapp_click: 'Contact',
        telegram_click: 'Contact',
        checklist_optin: 'CompleteRegistration',
      };
      const evt = standard[goal] || 'ClickButton';
      window.ttq.track(evt, params);
    } catch (e) {
      console.warn('[analytics] TikTok pixel goal failed', e);
    }
  }

  if (CLARITY_ID && window.clarity) {
    try {
      window.clarity('event', goal);
    } catch (e) {
      console.warn('[analytics] Clarity event failed', e);
    }
  }
}

/** Diagnostics for local debugging — not used in prod. */
export function analyticsStatus() {
  return {
    yandexMetrika: !!YM_ID,
    metaPixel: !!META_PIXEL_ID,
    tiktokPixel: !!TIKTOK_PIXEL_ID,
    clarity: !!CLARITY_ID,
  };
}
