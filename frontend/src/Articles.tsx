import { useEffect } from 'react'
import {
  ARTICLES,
  articleUrl,
  formatArticleDate,
  getArticle,
  type Article,
} from './articles'
import { SiteFooter } from './SiteFooter'
import { SiteNav } from './SiteNav'
import './App.css'
import './Essay.css'
import './Articles.css'

const INDEX_TITLE = 'Статьи — пиздато, хуёво и голосование | pizdato.net'
const INDEX_DESCRIPTION =
  'Статьи pizdato.net: что значит пиздато, зачем пара пиздато / хуёво и почему на сайте только один голос.'

function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title
    let meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta?.getAttribute('content') ?? null
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', description)
    return () => {
      document.title = prevTitle
      if (prevDesc !== null) meta?.setAttribute('content', prevDesc)
    }
  }, [title, description])
}

function ArticleNotFound() {
  usePageMeta('Статья не найдена — pizdato.net', 'Такой статьи нет. Смотрите список статей на pizdato.net.')

  return (
    <div className="page page-essay page-articles">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <SiteNav current="articles" />

      <article className="essay">
        <header className="essay-masthead">
          <p className="essay-kicker">Статьи</p>
          <div className="essay-title-wrap">
            <h1>Нет такой статьи</h1>
          </div>
          <p className="essay-dek">
            Ссылка битая или материал ещё не вышел. Полный список — ниже.
          </p>
        </header>
        <p>
          <a href="/articles">← Ко всем статьям</a>
        </p>
      </article>

      <SiteFooter current="articles" cta />
    </div>
  )
}

function ArticleView({ article }: { article: Article }) {
  const title = `${article.title} | pizdato.net`
  usePageMeta(title, article.description)

  return (
    <div className="page page-essay page-articles">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <SiteNav current="articles" />

      <article className="essay">
        <header className="essay-masthead">
          <p className="essay-kicker">
            <a className="articles-kicker-link" href="/articles">
              Статьи
            </a>
          </p>
          <div className="essay-title-wrap">
            <h1>{article.title}</h1>
          </div>
          <p className="essay-dek">{article.dek}</p>
          <p className="essay-byline">
            <span>pizdato.net</span>
            <span className="footer-sep" aria-hidden="true">
              ·
            </span>
            <span>~{article.readingMinutes} мин</span>
            <span className="footer-sep" aria-hidden="true">
              ·
            </span>
            <time dateTime={article.datePublished}>
              {formatArticleDate(article.datePublished)}
            </time>
          </p>
        </header>

        <div
          className="essay-body"
          dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
        />

        <nav className="articles-end" aria-label="Ещё по теме">
          <a href="/articles">Все статьи</a>
          <span className="footer-sep" aria-hidden="true">
            ·
          </span>
          <a href="/">Голосование</a>
          <span className="footer-sep" aria-hidden="true">
            ·
          </span>
          <a href="/lenta">Лента</a>
        </nav>
      </article>

      <SiteFooter current="articles" cta />
    </div>
  )
}

function ArticlesIndex() {
  usePageMeta(INDEX_TITLE, INDEX_DESCRIPTION)

  return (
    <div className="page page-essay page-articles">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <SiteNav current="articles" />

      <div className="essay">
        <header className="essay-masthead">
          <p className="essay-kicker">Статьи</p>
          <div className="essay-title-wrap">
            <h1>Статьи</h1>
          </div>
          <p className="essay-dek">
            Короткие тексты про слово, две кнопки и общий счёт — без бюрократии, с
            лёгкой иронией.
          </p>
        </header>

        <ul className="articles-list">
          {ARTICLES.map((article) => (
            <li key={article.slug} className="articles-item">
              <a className="articles-item-link" href={articleUrl(article.slug)}>
                <h2 className="articles-item-title">{article.title}</h2>
                <p className="articles-item-dek">{article.dek}</p>
                <p className="articles-item-meta">
                  <time dateTime={article.datePublished}>
                    {formatArticleDate(article.datePublished)}
                  </time>
                  <span className="footer-sep" aria-hidden="true">
                    ·
                  </span>
                  <span>~{article.readingMinutes} мин</span>
                </p>
              </a>
            </li>
          ))}
        </ul>

        <p className="articles-aside">
          Длинный разбор бинарностей — в{' '}
          <a href="/issledovanie">эссе</a>. Живые вердикты новостей — в{' '}
          <a href="/lenta">ленте</a>.
        </p>
      </div>

      <SiteFooter current="articles" cta />
    </div>
  )
}

export default function Articles() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/articles') return <ArticlesIndex />

  const slug = path.startsWith('/articles/') ? path.slice('/articles/'.length) : ''
  const article = slug ? getArticle(slug) : undefined
  if (!article) return <ArticleNotFound />
  return <ArticleView article={article} />
}
