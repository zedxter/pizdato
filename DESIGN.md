---
version: alpha
name: Pizdato
description: Meme-tracker for humanity — binary verdicts on news and culture. Dark, glitchy, two-pole (green / red), with rough edges and a straight face.
colors:
  primary: "#0C1210"
  secondary: "#9AAB9E"
  tertiary: "#3DFF9A"
  neutral: "#14201A"
  on-primary: "#F2F5F0"
  on-tertiary: "#06100B"
  danger: "#FF4D3D"
  on-danger: "#06100B"
  surface-good-deep: "#0F8F52"
  surface-bad-deep: "#A31F14"
  line: "rgba(242, 245, 240, 0.12)"
  line-hover: "rgba(242, 245, 240, 0.25)"
typography:
  display-hero:
    fontFamily: "'Bebas Neue', Impact, sans-serif"
    fontSize: 11rem
    fontWeight: 400
    lineHeight: 0.85
    letterSpacing: "0.02em"
  display-ui:
    fontFamily: "'Bebas Neue', Impact, sans-serif"
    fontSize: 1.55rem
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.04em"
  essay-title:
    description: "Essay page h1 titles — intentionally uses Bebas Neue as a display-level treatment, documented exception to the h1 token"
    fontFamily: "'Bebas Neue', Impact, sans-serif"
    fontSize: clamp(2rem, 8.2vw, 3.85rem)
    fontWeight: 400
    lineHeight: 0.96
    letterSpacing: "0.015em"
  h1:
    fontFamily: "'Manrope', system-ui, sans-serif"
    fontSize: 1.55rem
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  h2:
    fontFamily: "'Manrope', system-ui, sans-serif"
    fontSize: 1.25rem
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "0.01em"
  body-lg:
    fontFamily: "'Manrope', system-ui, sans-serif"
    fontSize: 1.05rem
    fontWeight: 700
    lineHeight: 1.4
  body-md:
    fontFamily: "'Manrope', system-ui, sans-serif"
    fontSize: 0.98rem
    fontWeight: 600
    lineHeight: 1.45
  label-small:
    fontFamily: "'Manrope', system-ui, sans-serif"
    fontSize: 0.82rem
    fontWeight: 700
    letterSpacing: "0.01em"
  label-caps:
    fontFamily: "'Manrope', system-ui, sans-serif"
    fontSize: 0.75rem
    fontWeight: 700
    letterSpacing: "0.18em"
  eyebrow:
    fontFamily: "'Manrope', system-ui, sans-serif"
    fontSize: 0.85rem
    fontWeight: 700
    letterSpacing: "0.28em"
  quote:
    fontFamily: "'Manrope', system-ui, sans-serif"
    fontSize: 1.15rem
    fontWeight: 700
    lineHeight: 1.45
rounded:
  sm: 4px
  md: 8px
  lg: 16px
  full: 9999px
  card: 0.45rem
  thumb: 0.35rem
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
components:
  page-bg:
    backgroundColor: "{colors.primary}"
  page-bg-neutral:
    backgroundColor: "{colors.neutral}"
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.sm}"
    padding: 16px 24px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-danger}"
    rounded: "{rounded.sm}"
    padding: 16px 24px
  surface-card:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.card}"
    padding: 16px 17px 17px
  surface-card-hover:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.card}"
    padding: 16px 17px 17px
  bar-fill-good:
    backgroundColor: "{colors.tertiary}"
    height: 100%
  bar-fill-good-deep:
    backgroundColor: "{colors.surface-good-deep}"
    height: 100%
  bar-fill-bad:
    backgroundColor: "{colors.danger}"
    height: 100%
  bar-fill-bad-deep:
    backgroundColor: "{colors.surface-bad-deep}"
    height: 100%
  brand-mark:
    rounded: "{rounded.lg}"
    size: clamp(5rem, 15vw, 8rem)
  separator:
    backgroundColor: "{colors.line}"
    height: 1px
  separator-hover:
    backgroundColor: "{colors.line-hover}"
    height: 1px
---
## Overview

Pizdato — не коммерческий продукт, а мемо-трекер человечества. Одна страница,
две кнопки (пиздато / хуёво), никакой регистрации. Это бинарная машина:
человек делает один жест — и счётчик мира обновляется.

**Голос дизайна:** ноктюрн с неоном. Тёмный фон как холст, кислотный
зелёный и красный как два полюса (добро/зло, лайк/дизлайк — без полутонов).
Никакого white-label, никакой профессиональной стерильности. Текст прямым
шрифтом, без полировки — как записка на стене. Градиенты и дымка —
только для атмосферы, не поверх контента.

**Эмоция:** «честно, грубо, смешно, не ври». Дизайн не про «удобный сервис»,
а про жест. Каждый элемент должен ощущаться как разговор в курилке, а не
как презентация в Boardroom.

## Colors

- **Primary (#0C1210):** Глубокий болотный чёрный — вся подложка. Фон по
  умолчанию. Не используй чистый #000 — он убивает слоистость.
- **Neutral (#14201A):** Слой между фоном и контентом — секции, боксы,
  hover-состояния на навигации. На полшага светлее primary.
- **Secondary (#9AAB9E):** Тихое «второстепенное»: мета-текст, даты,
  подписи, eyebrow-заголовки. Не для акцентов — для фона.
- **Tertiary (#3DFF9A):** Единственный «хороший» акцент. Кнопка «Пиздато»,
  активные состояния, анимированные индикаторы, бордер при hover.
  Использовать точечно — как единственный зелёный сигнал на странице.
- **Danger (#FF4D3D):** «Плохой» акцент. Кнопка «Хуёво», бары негатива,
  сообщения об ошибках. Красный = тревога или отрицание, не декорация.
- **On-primary (#F2F5F0):** Основной текст. Тёплый белый (с каплей зелёного),
  чтобы не резал глаз на чёрном фоне.
- **Line (rgba(242,245,240,0.12)):** Тонкий разделитель — бордеры карточек,
  линия в шаринге, нав-бар. Почти невидимый — только намёк на границу.
- **Line-hover (rgba(242,245,240,0.25)):** Бордер при наведении на
  интерактивную карточку.
- **Confetti-good:** `#3dff9a`, `#22d97f`, `#7dffc8`, `#ffffff` — палитра
  конфетти для «пиздато» (голосование). Только градиент tertiary: от
  базового зелёного через тёмный и светлый оттенки до белого акцента.
  Никаких дополнительных цветов — только спектр tertiary.
- **Confetti-bad:** `#ff4d3d`, `#ff7a3d`, `#ff8a7d`, `#ffffff` — палитра
  конфетти для «хуёво». Только градиент danger: от базового красного
  через светлые оттенки до белого акцента. Без жёлтого и других цветов.
- **Surface-good-deep (#0F8F52) / Surface-bad-deep (#A31F14):** Нижние
  слои progress-баров — глубокий фон для анимации заполнения.

## Typography

Два шрифта. Никаких переменных вариаций.

- **Bebas Neue** — только для бренда и hero display, а также для essay-title (h1 страниц-эссе — документированное исключение). Прописные, широкий
  кернинг, маленький интерлиньяж. Один weight (400).
- **Manrope** — всё остальное. weight 600–800 для иерархии.

**Правила:**
- `quote` может использовать `clamp(1.05rem, 2.4vw, 1.22rem)` в реальном CSS
  для комфорта на мобильных, но DESIGN.md токен фиксирован (1.15rem).
- `label-caps` и `eyebrow` в реальном CSS получают `text-transform: uppercase`
  — это НЕ токен DESIGN.md, а CSS-свойство, добавляемое в stylesheet.
- Никакого italic, кроме подписей авторов в цитатах (стилистическое решение,
  не токен).

## Layout

- **Макет:** одна колонка, центрированный контент (max-width 44rem).
  Hero-секция всегда выровнена по центру (это исключение из CenterCrutch).
- **Hero:** полная высота экрана (flex: 1), вертикально отцентрирован.
  Крупный бренд-лок (display-hero) + tagline + две кнопки.
- **Страницы-эссе:** статьи в одной колонке, заголовки слева. Никаких
  сайдбаров.
- **Лента:** карточки `surface-card` в стопку (flex-direction: column),
  с grid-аватаром (текст + превью справа).
- **Брейкпоинты (raw px, не var()):** 720px (мобильная навигация),
  560px (карточки ленты), 420px (микро-отступы).

**Правило:** Никогда не используй `var()` в `@media`-условиях — CSS
запрещает. Все брейкпоинты — raw px.

## Elevation & Depth

- **Glow-элементы** — псевдо-атмосферные пятна (зелёное и красное) с
  анимацией drift. Под контентом, pointer-events: none.
- **Noise** — SVG-турбулентность поверх фона (opacity 0.07,
  mix-blend-mode: overlay). pointer-events: none.
- **Тени** — только на brand-mark (box-shadow) и кнопках для акцента.
  На карточках теней НЕТ — только бордер.
- **Nav-bar** — backdrop-filter: blur(12px) + полупрозрачный фон.

## Shapes

- **Кнопки** — sm (4px), почти квадратные, без пилюль.
- **Карточки** — card (0.45rem = ~7px), бордер 1px solid line.
- **Превью** — thumb (0.35rem = ~5.6px).
- **Бренд-марк** — lg (16px, 22%) — не круг, не квадрат.
- **Аватарки/точки** — full (50%).

## Components

- `page-bg` / `page-bg-neutral` — основные поверхности.
- `button-primary` / `button-danger` — единственные два action-элемента.
  Градиент в CSS (зелёный → светло-зелёный / красный → оранжевый).
- `surface-card` / `surface-card-hover` — контейнеры для контента (карточки
  ленты, блоки голосования). No shadow. Бордер = line.
- `bar-fill-good` / `bar-fill-bad` — прогресс-бары. Deep-варианты — для
  анимации нижнего слоя.
- `brand-mark` — логотип (сейчас фото/изображение) с закруглением.
- Вердикты в карточках: текст зелёный (tertiary) для «пиздато», красный
  (danger) для «хуёво». Текст — label-small.
- `focus-ring` — глобальный :focus-visible для всех интерактивных
  элементов. outline: 2px solid {colors.tertiary}, outline-offset: 2px.

## Do's and Don'ts

- **Do** писать копирайтинг конкретно и честно: факты, не преувеличения.
- **Do** использовать token references (`{colors.primary}`) — нигде не
  повторять hex вручную.
- **Do** проверять WCAG-контраст: on-primary на primary = основная рабочая
  пара.
- **Don't** добавлять цвета вне палитры без обсуждения.
- **Don't** использовать чистый #000 — теряется слоистость.
- **Don't** центрировать текст на страницах-эссе (CenterCrutch).
- **Don't** использовать italic для обычного текста — только подписи.

## Anti-patterns

### CardWall
*Все карточки одинакового размера в ряд, без иерархии.*

**Как не надо:** Три одинаковые карточки по 33% ширины, все с заголовком
14px, без выделения главной.

**Как надо:** В pizdato.net лента — стопка (flex column), каждая карточка
на всю ширину. Hero-элемент выше и крупнее supporting cards.

### RainbowStrip
*Все цвета палитры используются одновременно.*

**Как не надо:** Заголовок tertiary, подзаголовок danger, фон neutral,
бордер secondary, иконка primary — на одном экране.

**Как надо:** Один акцентный цвет на страницу. Tertiary и danger —
взаимоисключающие (бинарный полюс). Остальное — нейтральные тона.

### CenterCrutch
*Всё выровнено по центру.*

**Как не надо:** Заголовок, текст, ссылка, карточка, кнопка — всё по
центру. Трудно сканировать.

**Как надо:** Hero-секция landing — центрирована (исключение). Все
остальные страницы — заголовки слева, текст в одну колонку (max-width
44rem).

### PaddingPanic
*Огромные отступы между секциями.*

**Как не надо:** 120px margin-top между hero и лентой — редкие островки
текста в пустыне пикселей.

**Как надо:** Отступы — только из токенов spacing. Максимум xl (48px).
Для заполнения — микро-анимации, quotes, дополнительный контент.

### IconOverload
*Иконка перед каждым пунктом списка.*

**Как не надо:** Каждый абзац в FAQ — с иконкой, в ленте каждый элемент —
с иконкой, в навигации — иконка+текст.

**Как надо:** Иконки — только для интерактивных элементов (share-кнопки)
и brand-mark. Список в навигации — чистый текст.

### GradientOverkill
*Градиенты на каждом фоне.*

**Как не надо:** Карточки с градиентным фоном, кнопки с градиентом,
подвал с градиентом. Выглядит как дешёвый глянец.

**Как надо:** Градиенты — только для фоновых радиалов на .page
(атмосфера) и заливки action-кнопок. Всё остальное — сплошные цвета.

### ShadowFlood
*Тени у всех элементов подряд.*

**Как не надо:** Каждая карточка, кнопка, иконка — с box-shadow.
Плоский дизайн превращается в «грязный».

**Как надо:** box-shadow — только на brand-mark и кнопках. Карточки —
border, не тень.