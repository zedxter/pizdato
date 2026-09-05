import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteNav } from '../SiteNav'
import { SiteFooter } from '../SiteFooter'

describe('SiteNav', () => {
  it('renders nav links with Russian labels', () => {
    render(<SiteNav current="home" />)
    expect(screen.getByLabelText('pizdato — на главную')).toBeInTheDocument()
    expect(screen.getByText('Голосование')).toBeInTheDocument()
    expect(screen.getByText('Лента')).toBeInTheDocument()
    expect(screen.getByText('Статьи')).toBeInTheDocument()
    expect(screen.getByText('FAQ')).toBeInTheDocument()
  })

  it('highlights the current page link with aria-current', () => {
    render(<SiteNav current="faq" />)
    const faqLink = screen.getByText('FAQ')
    expect(faqLink.closest('a')).toHaveAttribute('aria-current', 'page')
  })

  it('has no aria-current for non-current links', () => {
    render(<SiteNav current="home" />)
    const faqLink = screen.getByText('FAQ')
    expect(faqLink.closest('a')).not.toHaveAttribute('aria-current')
  })

  it('renders toggle button with aria-expanded=false', () => {
    render(<SiteNav current="home" />)
    const toggle = screen.getByRole('button', { name: 'Меню' })
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('SiteFooter', () => {
  it('renders footer nav links', () => {
    render(<SiteFooter />)
    expect(screen.getByText('Голосование')).toBeInTheDocument()
    expect(screen.getByText('Лента')).toBeInTheDocument()
    expect(screen.getByText('Статьи')).toBeInTheDocument()
    expect(screen.getByText('FAQ')).toBeInTheDocument()
  })

  it('highlights current page with aria-current', () => {
    render(<SiteFooter current="faq" />)
    const link = screen.getByText('FAQ')
    expect(link).toHaveAttribute('aria-current', 'page')
  })

  it('renders Telegram channel link', () => {
    render(<SiteFooter />)
    const tgLink = screen.getByText(/Telegram-канал пиздато/)
    expect(tgLink).toBeInTheDocument()
    expect(tgLink.closest('a')).toHaveAttribute('href', 'https://t.me/pizdato_net')
  })

  it('renders CTA section when cta=true', () => {
    render(<SiteFooter cta={true} />)
    expect(screen.getByText(/Мир ждёт твоего голоса/)).toBeInTheDocument()
    expect(screen.getByText('https://pizdato.net')).toBeInTheDocument()
  })

  it('does not render CTA section when cta=false', () => {
    render(<SiteFooter cta={false} />)
    expect(screen.queryByText(/Мир ждёт твоего голоса/)).not.toBeInTheDocument()
  })
})