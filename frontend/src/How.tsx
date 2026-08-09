import { useEffect } from 'react'
import { SiteFooter } from './SiteFooter'
import { SiteNav } from './SiteNav'
import './App.css'
import './Essay.css'

const TITLE = 'Как это работает — pizdato'
const DESCRIPTION =
  'Как устроено голосование пиздато / хуёво, зачем новости влияют на общий счёт и почему один клик всё ещё имеет смысл.'

export default function How() {
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
    <div className="page page-essay page-how">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <SiteNav current="how" />

      <article className="essay how">
        <header className="essay-masthead">
          <p className="essay-kicker">Механика</p>
          <div className="essay-title-wrap">
            <h1>Как это работает</h1>
          </div>
          <p className="essay-dek">
            Коротко: две кнопки, один общий счёт человечества — и новости, которые
            тоже умеют голосовать. Дальше — без бюрократии, с лёгкой иронией.
          </p>
        </header>

        <div className="essay-body">
          <h2>Две кнопки, один жест</h2>
          <p>
            На <a href="/">главной</a> мир сжимается до честного выбора:{' '}
            <strong>сделать пиздато</strong> или <strong>сделать хуёво</strong>. Без
            регистрации, без двадцати шкал «насколько вам нравится». Один
            осмысленный клик — и ты уже в общей статистике.
          </p>
          <p>
            Голос один и навсегда: не ферма кликов, а жест. После него видно, как
            сейчас обстоят дела у человечества, и выпадает короткая мудрость —
            чтобы было что отправить другу.
          </p>

          <h2>Новости тоже голосуют</h2>
          <p>
            Рядом с людьми на счётчик влияют и свежие новости. Мы берём историю из
            потока, решаем — пиздато это или хуёво — и фиксируем вердикт в общий
            счёт. Разборы живут в{' '}
            <a href="/lenta">ленте</a>: заголовок, вердикт, коротко почему.
          </p>
          <p>
            Новости часто приходят с тяжёлым уклоном. Пожары, абсурд, срывы,
            «ну и день». Если смотреть только ленту, легко решить, что человечество
            уже проиграло график. Это не баг ленты — так устроен информационный
            шум: плохое кричит громче.
          </p>

          <h2>Почему тогда вообще кликать</h2>
          <p>
            Потому что счётчик — не приговор и не сводка МЧС. Это коллективный жест.
            Лента может тащить полоску в хуёво, а люди — выравнивать картину. Или
            наоборот: честно признать, что сегодня хуёво, и не притворяться, что
            «всё пиздато».
          </p>
          <p>
            В наших руках и в руках каждого из нас лежит простая ответственность:
            не отдать весь мир одним только заголовкам. Один голос не чинит планету.
            Но он меняет долю на графике — и напоминает, что оценка мира всё ещё
            принадлежит людям, а не только ленте новостей.
          </p>
          <p>
            Если хочешь детали про cookie, антиабус и «можно ли переголосовать» —
            это в <a href="/faq">FAQ</a>. Если про смысл двух полюсов в культуре —
            в <a href="/issledovanie">эссе</a>. А если готов к жесту —
            мир уже ждёт на <a href="/">pizdato.net</a>.
          </p>
        </div>
      </article>

      <SiteFooter current="how" cta />
    </div>
  )
}
