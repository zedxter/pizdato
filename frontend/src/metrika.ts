/** Yandex.Metrica — failures must never break voting or navigation. */

export const METRIKA_ID = 111534101

export const GOAL_VOTE_SUCCESS = 'vote_success'
export const GOAL_TELEGRAM_CLICK = 'telegram_click'

type YmFn = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number }

declare global {
  interface Window {
    ym?: YmFn
  }
}

function loadTagScript(): void {
  const src = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`
  const scripts = document.scripts
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i]?.src === src) return
  }
  const s = document.createElement('script')
  s.async = true
  s.src = src
  const first = document.getElementsByTagName('script')[0]
  first?.parentNode?.insertBefore(s, first)
}

/** Init counter once per page load. Safe to call from main.tsx. */
export function initMetrika(): void {
  try {
    const w = window
    const ym: YmFn =
      w.ym ||
      function (...args: unknown[]) {
        ;(ym.a = ym.a || []).push(args)
      }
    w.ym = ym
    ym.l = Date.now()
    loadTagScript()
    ym(METRIKA_ID, 'init', {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: 'dataLayer',
      accurateTrackBounce: true,
      trackLinks: true,
    })
  } catch {
    /* ignore */
  }
}

export function reachGoal(goal: string): void {
  try {
    window.ym?.(METRIKA_ID, 'reachGoal', goal)
  } catch {
    /* ignore */
  }
}

/** Track primary channel links (nav, footer, in-article). */
export function bindTelegramOutboundTracking(): void {
  try {
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target
        if (!(target instanceof Element)) return
        const anchor = target.closest('a')
        if (!anchor) return
        const href = anchor.getAttribute('href') ?? ''
        if (/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\/pizdato_net\b/i.test(href)) {
          reachGoal(GOAL_TELEGRAM_CLICK)
        }
      },
      true,
    )
  } catch {
    /* ignore */
  }
}
