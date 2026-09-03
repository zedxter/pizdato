/**
 * Cookie consent & Yandex.Metrika loader for pizdato.net.
 *
 * - voter_id cookie (anti-abuse) is strictly necessary — never blocked.
 * - Yandex.Metrika loads only after explicit opt-in.
 * - Choice saved to localStorage.
 */

(function () {
  'use strict'

  var STORAGE_KEY = 'pizdato_cookie_consent'
  var METRIKA_ID = 111534101

  function loadMetrika() {
    ;(function (m, e, t, r, i) {
      m[i] =
        m[i] ||
        function () {
          ;(m[i].a = m[i].a || []).push(arguments)
        }
      m[i].l = 1 * new Date()
      for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) return
      }
      var k = e.createElement(t)
      var a = e.getElementsByTagName(t)[0]
      k.async = 1
      k.src = r
      a.parentNode.insertBefore(k, a)
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + METRIKA_ID, 'ym')

    ym(METRIKA_ID, 'init', {
      ssr: true,
      webvisor: false,
      clickmap: true,
      triggerEvent: true,
      accurateTrackBounce: true,
      trackLinks: true,
    })
  }

  function injectStyles() {
    var style = document.createElement('style')
    style.textContent =
      '#cookie-consent-banner{position:fixed;bottom:0;left:0;right:0;z-index:9999;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;background:#1c1c1c;border-top:1px solid #333;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#bbb}' +
      '.cookie-consent-text{flex:1;min-width:200px}' +
      '.cookie-consent-text a{color:#8ab4f8;text-decoration:underline}' +
      '.cookie-consent-btn{background:#4a7c59;color:#fff;border:none;border-radius:6px;padding:8px 20px;cursor:pointer;font-size:14px;font-weight:600;white-space:nowrap}' +
      '.cookie-consent-btn:hover{background:#3d6b4c}'
    document.head.appendChild(style)
  }

  function showBanner() {
    injectStyles()

    var banner = document.createElement('div')
    banner.id = 'cookie-consent-banner'

    var text = document.createElement('span')
    text.className = 'cookie-consent-text'
    text.textContent = 'Мы используем cookies для аналитики (Yandex.Metrika) и защиты от накруток. '

    var link = document.createElement('a')
    link.href = '/privacy'
    link.textContent = 'Подробнее'

    text.appendChild(link)
    banner.appendChild(text)

    var btn = document.createElement('button')
    btn.className = 'cookie-consent-btn'
    btn.textContent = 'Принять'
    btn.addEventListener('click', function () {
      try {
        localStorage.setItem(STORAGE_KEY, 'accepted')
      } catch (_) {}
      if (banner.parentNode) banner.parentNode.removeChild(banner)
      loadMetrika()
    })

    banner.appendChild(btn)
    document.body.appendChild(banner)
  }

  // voter_id is set server-side — strictly necessary, never blocked by this script.
  try {
    var consent = localStorage.getItem(STORAGE_KEY)
    if (consent === 'accepted') {
      loadMetrika()
    } else {
      showBanner()
    }
  } catch (_) {
    // localStorage unavailable — show banner anyway
    showBanner()
  }
})()
