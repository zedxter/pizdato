export type NavId = 'home' | 'brand' | 'lenta' | 'articles' | 'essay' | 'faq'

export const NAV_LINKS: { id: NavId; href: string; label: string }[] = [
  { id: 'home', href: '/', label: 'Голосование' },
  { id: 'lenta', href: '/lenta', label: 'Лента' },
  { id: 'articles', href: '/articles', label: 'Статьи' },
  { id: 'brand', href: '/pizdato', label: 'Пиздато' },
  { id: 'essay', href: '/issledovanie', label: 'Эссе' },
  { id: 'faq', href: '/faq', label: 'FAQ' },
]
