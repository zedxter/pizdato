import { useEffect, type ReactNode } from 'react'
import './App.css'
import './Essay.css'
import './Faq.css'

const TITLE = 'FAQ — частые вопросы о pizdato.net'
const DESCRIPTION =
  'Как работает голосование пиздато / хуёво: один голос, антиабус, Telegram-канал, исследование и публичная статистика.'

type FaqItem = {
  id: string
  q: string
  a: ReactNode
}

const FAQS: FaqItem[] = [
  {
    id: 'what',
    q: 'Что такое pizdato.net?',
    a: (
      <>
        Это голосование на две стороны: <strong>сделать пиздато</strong> или{' '}
        <strong>сделать хуёво</strong>. Живые счётчики показывают, куда сейчас
        склоняется коллективная оценка. Без регистрации, без длинных анкет — один
        осмысленный жест.
      </>
    ),
  },
  {
    id: 'meaning',
    q: 'Что значат «пиздато» и «хуёво»?',
    a: (
      <>
        Это два полюса оценки, а не юридический вердикт. «Пиздато» — когда мир (или
        момент) зашёл. «Хуёво» — когда разлад, фальшь, антиклимакс. Подробнее о
        бинарностях в культуре — в{' '}
        <a href="/issledovanie">исследовании</a>.
      </>
    ),
  },
  {
    id: 'one-vote',
    q: 'Почему можно проголосовать только один раз?',
    a: (
      <>
        Чтобы голос оставался жестом, а не фермой кликов. Один осмысленный выбор на
        посетителя — часть задумки: «у тебя только один шанс повлиять на этот мир».
      </>
    ),
  },
  {
    id: 'change',
    q: 'Можно ли изменить голос?',
    a: (
      <>
        Нет. После успешного голосования выбор фиксируется. Это сознательное
        ограничение: решение должно ощущаться окончательным.
      </>
    ),
  },
  {
    id: 'how',
    q: 'Как сайт понимает, что я уже голосовал?',
    a: (
      <>
        Через HTTP-only cookie сессии, которая выдаётся при загрузке статистики, и
        мягкий антиабус по хешу IP (лимиты и защита от накрутки). Капчи и логина
        нет — только технические ограничители, чтобы публичные цифры не разъезжались.
      </>
    ),
  },
  {
    id: 'privacy',
    q: 'Вы храните мой IP и личные данные?',
    a: (
      <>
        Публично показываются только агрегаты: сколько пиздато / хуёво / всего. Для
        антиабуса используются технические признаки (в том числе хеш IP), а не
        открытый список адресов на сайте. Отдельного кабинета пользователя нет.
      </>
    ),
  },
  {
    id: 'bars',
    q: 'Что показывают полоски после голосования?',
    a: (
      <>
        Долю голосов за каждый полюс и общий счётчик. Это снимок настроения на
        момент запроса, а не «объективная истина о человечестве».
      </>
    ),
  },
  {
    id: 'wisdom',
    q: 'Откуда цитата после голоса?',
    a: (
      <>
        После голосования в герое появляется короткая «мудрость» — в духе канала и
        сайта: иронично, по делу, без морализаторства. Это часть ритуала, а не
        рекламный блок.
      </>
    ),
  },
  {
    id: 'telegram',
    q: 'Зачем Telegram-канал?',
    a: (
      <>
        <a
          href="https://t.me/pizdato_net"
          target="_blank"
          rel="noopener noreferrer"
        >
          @pizdato_net
        </a>{' '}
        — ежедневный разбор в той же оптике: новость, две стороны, короткая цитата.
        Сайт — жест и счётчик; канал — текст и ритм.
      </>
    ),
  },
  {
    id: 'essay',
    q: 'Что за страница «Исследование»?',
    a: (
      <>
        Длинное эссе о бинарных противостояниях (добро/зло, равенство/неравенство и
        т.д.) и о том, почему две кнопки — не шутка, а прозрачная форма оценки. Читать:{' '}
        <a href="/issledovanie">pizdato.net/issledovanie</a>.
      </>
    ),
  },
  {
    id: 'mcp',
    q: 'Что такое MCP на /mcp?',
    a: (
      <>
        Публичный read-only{' '}
        <a href="https://modelcontextprotocol.io/" target="_blank" rel="noopener noreferrer">
          MCP
        </a>
        -эндпоинт для ассистентов: инструмент <code>get_stats</code> отдаёт те же
        агрегаты голосов. Секретов и внутренних путей там нет.
      </>
    ),
  },
  {
    id: 'share',
    q: 'Как поделиться?',
    a: (
      <>
        После голоса доступен блок «Кинь другу»: превью-бейдж, копирование, Telegram /
        VK и системный share, где браузер позволяет. Можно просто скинуть ссылку на{' '}
        <a href="/">pizdato.net</a>.
      </>
    ),
  },
]

export default function Faq() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = TITLE
    let meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta?.getAttribute('content') ?? null
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', DESCRIPTION)
    return () => {
      document.title = prevTitle
      if (prevDesc !== null) meta?.setAttribute('content', prevDesc)
    }
  }, [])

  return (
    <div className="page page-essay page-faq">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <header className="essay-top">
        <a className="essay-brand" href="/">
          <img
            className="essay-brand-mark"
            src="/logo.png"
            width={48}
            height={48}
            alt=""
            decoding="async"
          />
          <span className="essay-brand-name">pizdato</span>
        </a>
        <a className="essay-back" href="/">
          К голосованию
        </a>
      </header>

      <article className="essay faq">
        <header className="essay-masthead">
          <p className="essay-kicker">Справка</p>
          <div className="essay-title-wrap">
            <h1>Частые вопросы</h1>
          </div>
          <p className="essay-dek">
            Коротко о голосовании, одном шансе, антиабусе и том, куда смотреть
            дальше — без бюрократии и без лишних тайн.
          </p>
          <p className="essay-byline">
            <span>pizdato.net</span>
            <span className="footer-sep" aria-hidden="true">
              ·
            </span>
            <span>{FAQS.length} вопросов</span>
          </p>
        </header>

        <div className="faq-list">
          {FAQS.map((item) => (
            <details key={item.id} id={item.id} className="faq-item">
              <summary className="faq-q">
                <span className="faq-q-text">{item.q}</span>
                <span className="faq-chevron" aria-hidden="true" />
              </summary>
              <div className="faq-a">{item.a}</div>
            </details>
          ))}
        </div>
      </article>

      <footer className="site-footer essay-footer">
        <p className="essay-cta">
          Мир ждёт твоего голоса. Остальное — уже легенда:
        </p>
        <a className="essay-cta-link" href="/">
          https://pizdato.net
        </a>
        <div className="footer-nav">
          <a className="channel-link" href="/issledovanie">
            Исследование
          </a>
          <span className="footer-sep" aria-hidden="true">
            ·
          </span>
          <a
            className="channel-link"
            href="https://t.me/pizdato_net"
            target="_blank"
            rel="noopener noreferrer me"
          >
            Telegram <span aria-hidden="true">@pizdato_net</span>
          </a>
        </div>
      </footer>
    </div>
  )
}
