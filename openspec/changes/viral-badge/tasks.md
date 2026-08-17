# Tasks — Viral Badge

## T1: Добавить подпись `pizdato.net` в горизонтальный бейдж

- Файл: `frontend/src/badge.ts`
- В `renderBadgeCanvas()`: после отрисовки пиллов, добавить `ctx.fillText('pizdato.net', contentRight - textWidth, H - 12)`
- Цвет: `#9aab9e`, шрифт: `500 11px Manrope, system-ui, sans-serif`
- Оценка: 15 минут

## T2: Добавить трекинг скачивания

- Файл: `frontend/src/badge.ts` — функция `downloadBadge()`
- После `canvas.toBlob()` добавить `navigator.sendBeacon('/_/event?type=badge_download')`
- Файл: `frontend/src/SharePanel.tsx` — кнопка «Сторис» (будет в T4)
- Добавить `navigator.sendBeacon('/_/event?type=badge_share_stories')`
- Оценка: 15 минут

## T3: Создать вертикальный бейдж (540×960)

- Файл: `frontend/src/badge.ts`
- Новая функция `renderVerticalBadgeCanvas(stats, wisdom): Promise<HTMLCanvasElement>`
- Размер: 540×960
- Расположение:
  - Верх: `PIZDATO.NET · МУДРОСТЬ ДНЯ` (15px)
  - Центр: выбор (42px) + цитата (19px) + автор (15px)
  - Низ: пиллы с процентами + `pizdato.net` подпись
- Новая функция `downloadVerticalBadge(stats, wisdom)`
- Оценка: 1 час

## T4: Добавить кнопку «Сторис» в SharePanel

- Файл: `frontend/src/SharePanel.tsx`
- После кнопки «Скачать бейдж» добавить кнопку «Сторис»
- Вызывает `downloadVerticalBadge(stats, wisdom)`
- Иконка: SVG (прямоугольник с уголком — символ сторис)
- Стиль: под существующие кнопки
- Оценка: 30 минут

## T5: Добавить метрику в дайджест

- Файл: крон `pizdato-owner-dm` (6:00)
- После строки «Голоса» добавить «Скачиваний бейджа: N»
- Данные: из `/_/event` логов nginx
- Оценка: 15 минут

---

**Итого:** ~2.5 часа работы
**Зависимости:** T1, T2, T3, T4 можно делать параллельно, T5 после T2