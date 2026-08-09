export type NavId = 'home' | 'how' | 'lenta' | 'essay' | 'faq'

export const NAV_LINKS: { id: NavId; href: string; label: string }[] = [
  { id: 'home', href: '/', label: 'Голосование' },
  { id: 'lenta', href: '/lenta', label: 'Лента' },
  { id: 'how', href: '/how', label: 'Как это работает' },
  { id: 'essay', href: '/issledovanie', label: 'Эссе' },
  { id: 'faq', href: '/faq', label: 'FAQ' },
]
