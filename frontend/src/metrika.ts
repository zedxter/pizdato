/** Yandex.Metrica — failures must never break voting or navigation. */

export const METRIKA_ID = 111534101

export const GOAL_VOTE_SUCCESS = 'vote_success'
export const GOAL_TELEGRAM_CLICK = 'telegram_click'

declare global {
  interface Window {
    // Official loader uses a callable with `.a` / `.l` queue fields.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ym?: any
  }
}

/**
 * Exact official bootstrap (arguments queue, not rest-array), so tag.js
 * drains init/reachGoal the same way as Metrika’s pasted snippet.
 */
export function initMetrika(): void {
  try {
    const counterId = METRIKA_ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(function (m: any, e: Document, t: string, r: string, i: string) {
      m[i] =
        m[i] ||
        function () {
          // eslint-disable-next-line prefer-rest-params
          ;(m[i].a = m[i].a || []).push(arguments)
        }
      m[i].l = 1 * Date.now()
      for (let j = 0; j < e.scripts.length; j++) {
        if (e.scripts[j]?.src === r) return
      }
      const k = e.createElement(t) as HTMLScriptElement
      const a = e.getElementsByTagName(t)[0]
      k.async = true
      k.src = r
      a?.parentNode?.insertBefore(k, a)
    })(
      window,
      document,
      'script',
      `https://mc.yandex.ru/metrika/tag.js?id=${counterId}`,
      'ym',
    )

    window.ym(counterId, 'init', {
      ssr: true,
      webvisor: true,
      clickmap: true,
      triggerEvent: true,
      accurateTrackBounce: true,
      trackLinks: true,
    })
  } catch {
    /* ignore */
  }
}

export function reachGoal(goal: string): void {
  try {
    if (typeof window.ym !== 'function') {
      initMetrika()
    }
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
