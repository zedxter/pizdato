import { useEffect } from 'react'
import { SiteFooter } from './SiteFooter'
import { SiteNav } from './SiteNav'
import './Essay.css'

const TITLE = 'Пиздато — что это и как работает | pizdato.net'
const DESCRIPTION =
  'Пиздато на pizdato.net: что значит слово, как устроено голосование пиздато / хуёво, зачем новости в общем счёте и Telegram-канал @pizdato_net.'

export default function PizdatoBrand() {
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
    <div className="page page-essay page-brand">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <SiteNav current="brand" />

      <article className="essay">
        <header className="essay-masthead">
          <p className="essay-kicker">Пиздато</p>
          <div className="essay-title-wrap">
            <h1>Пиздато</h1>
          </div>
          <p className="essay-dek">
            Слово, две кнопки и общий счёт человечества — без бюрократии, с лёгкой
            иронией. Коротко: что это и как работает.
          </p>
        </header>

        <div className="essay-body">
          <h2>Что значит пиздато</h2>
          <p>
            В разговорной речи <strong>пиздато</strong> — «отлично», «круто», «вот
            это да», иногда с ухмылкой. Рядом всегда пара:{' '}
            <strong>хуёво</strong>. Два полюса без полутонов. Словари это уже
            разобрали; мы берём слово как жест, а не как словарную статью.
            Короче — в статье{' '}
            <a href="/articles/chto-znachit-pizdato">«Что значит пиздато»</a>.
          </p>
          <p>
            Культура любит делить мир надвое: добро и зло, лайк и дизлайк. Пара
            пиздато / хуёво звучит грубее, но по сути та же бинарная машина —
            ближе к тому, как люди реально ругаются и радуются. Коротко — в{' '}
            <a href="/articles/pizdato-i-huyevo">«Пиздато и хуёво»</a>, длиннее — в{' '}
            <a href="/issledovanie">эссе</a>.
          </p>

          <h2>Две кнопки, один жест</h2>
          <p>
            На <a href="/">главной</a> мир сжимается до честного выбора:{' '}
            <strong>сделать пиздато</strong> или <strong>сделать хуёво</strong>.
            Без регистрации и без двадцати шкал. Один осмысленный клик — и ты в
            общей статистике.
          </p>
          <p>
            Голос один и навсегда: не ферма кликов, а жест. После него видно, как
            сейчас обстоят дела у человечества, и выпадает короткая мудрость —
            чтобы было что отправить другу. Зачем так — в{' '}
            <a href="/articles/zachem-odin-golos">«Почему один голос»</a>; cookie,
            антиабус и детали — в <a href="/faq">FAQ</a>.
          </p>

          <h2>Новости тоже голосуют</h2>
          <p>
            Рядом с людьми на счётчик влияют свежие новости. Берём историю из
            потока, решаем — пиздато это или хуёво — и фиксируем вердикт. Разборы
            живут в <a href="/lenta">ленте</a>: заголовок, вердикт, коротко почему.
          </p>
          <p>
            Новости часто с тяжёлым уклоном. Если смотреть только ленту, легко
            решить, что человечество уже проиграло график. Это не баг: плохое в
            информационном шуме кричит громче.
          </p>

          <h2>Почему тогда вообще кликать</h2>
          <p>
            Счётчик — не приговор и не сводка МЧС. Это коллективный жест. Лента
            может тащить полоску в хуёво, а люди — выравнивать картину. Или
            наоборот: честно признать, что сегодня хуёво, и не притворяться, что
            «всё пиздато».
          </p>
          <p>
            Один голос не чинит планету. Но он меняет долю на графике и
            напоминает: оценка мира всё ещё принадлежит людям, а не только
            заголовкам.
          </p>

          <h2>Telegram-канал пиздато</h2>
          <p>
            Сводки, вечерние разборы и мудрости дня — в{' '}
            <a
              href="https://t.me/pizdato_net"
              target="_blank"
              rel="noopener noreferrer me"
            >
              @pizdato_net
            </a>
            . Если искали просто «пиздато» — вы на месте. Можно{' '}
            <a href="/">проголосовать</a> или заглянуть в канал.
          </p>
        </div>
      </article>

      <SiteFooter current="brand" cta />
    </div>
  )
}
