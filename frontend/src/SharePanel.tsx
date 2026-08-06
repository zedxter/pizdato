import { useEffect, useState } from 'react'
import type { Stats } from './api'
import { downloadBadge, renderBadgeCanvas } from './badge'
import type { Wisdom } from './quotes'
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconMore,
  IconQuote,
  IconTelegram,
  IconVk,
} from './ShareIcons'
import {
  buildQuoteShareText,
  buildShareText,
  copyShareText,
  nativeShare,
  telegramShareUrl,
  vkShareUrl,
  vkShareUrlForChoice,
} from './share'

type Props = {
  stats: Stats
  wisdom: Wisdom
}

export function SharePanel({ stats, wisdom }: Props) {
  const [copied, setCopied] = useState<'result' | 'quote' | null>(null)
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null)
  const [badgeBusy, setBadgeBusy] = useState(false)
  const resultText = buildShareText(stats, wisdom)
  const quoteText = buildQuoteShareText(wisdom)
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false

    void (async () => {
      try {
        const canvas = await renderBadgeCanvas(stats, wisdom)
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png'),
        )
        if (!blob || cancelled) return
        const url = URL.createObjectURL(blob)
        revoked = url
        setBadgeUrl(url)
      } catch {
        if (!cancelled) setBadgeUrl(null)
      }
    })()

    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [stats, wisdom])

  async function onCopy(kind: 'result' | 'quote') {
    try {
      await copyShareText(kind === 'quote' ? quoteText : resultText)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  async function onNative(kind: 'result' | 'quote') {
    const ok = await nativeShare(kind === 'quote' ? quoteText : resultText)
    if (!ok) await onCopy(kind)
  }

  async function onDownloadBadge() {
    setBadgeBusy(true)
    try {
      await downloadBadge(stats, wisdom)
    } finally {
      setBadgeBusy(false)
    }
  }

  return (
    <div className="share">
      <p className="share-heading">Поделиться мудростью</p>
      <div className="share-actions" role="group" aria-label="Поделиться цитатой">
        <a
          className="share-icon-btn"
          href={telegramShareUrl(quoteText)}
          target="_blank"
          rel="noopener noreferrer"
          title="Цитата в Telegram"
          aria-label="Поделиться цитатой в Telegram"
        >
          <IconTelegram className="share-icon" />
        </a>
        <a
          className="share-icon-btn"
          href={vkShareUrl(quoteText, 'Мудрость дня — pizdato')}
          target="_blank"
          rel="noopener noreferrer"
          title="Цитата во VK"
          aria-label="Поделиться цитатой во ВКонтакте"
        >
          <IconVk className="share-icon" />
        </a>
        <button
          type="button"
          className="share-icon-btn"
          title={copied === 'quote' ? 'Скопировано' : 'Скопировать цитату'}
          aria-label={copied === 'quote' ? 'Скопировано' : 'Скопировать цитату'}
          onClick={() => void onCopy('quote')}
        >
          {copied === 'quote' ? (
            <IconCheck className="share-icon" />
          ) : (
            <IconQuote className="share-icon" />
          )}
        </button>
        {canNativeShare && (
          <button
            type="button"
            className="share-icon-btn"
            title="Ещё"
            aria-label="Поделиться цитатой иначе"
            onClick={() => void onNative('quote')}
          >
            <IconMore className="share-icon" />
          </button>
        )}
      </div>

      <p className="share-heading share-heading-spaced">Кинь другу — пусть тоже выберет</p>

      {badgeUrl && (
        <img
          className="badge-preview"
          src={badgeUrl}
          alt="Бейдж результата pizdato"
          width={720}
          height={280}
        />
      )}

      <div className="share-actions" role="group" aria-label="Поделиться результатом">
        <a
          className="share-icon-btn"
          href={telegramShareUrl(resultText)}
          target="_blank"
          rel="noopener noreferrer"
          title="Telegram"
          aria-label="Поделиться результатом в Telegram"
        >
          <IconTelegram className="share-icon" />
        </a>
        <a
          className="share-icon-btn"
          href={vkShareUrlForChoice(resultText, stats.choice)}
          target="_blank"
          rel="noopener noreferrer"
          title="VK"
          aria-label="Поделиться результатом во ВКонтакте"
        >
          <IconVk className="share-icon" />
        </a>
        <button
          type="button"
          className="share-icon-btn"
          title={copied === 'result' ? 'Скопировано' : 'Скопировать результат'}
          aria-label={copied === 'result' ? 'Скопировано' : 'Скопировать результат'}
          onClick={() => void onCopy('result')}
        >
          {copied === 'result' ? (
            <IconCheck className="share-icon" />
          ) : (
            <IconCopy className="share-icon" />
          )}
        </button>
        <button
          type="button"
          className="share-icon-btn"
          title="Скачать бейдж PNG"
          aria-label="Скачать бейдж PNG"
          disabled={badgeBusy}
          onClick={() => void onDownloadBadge()}
        >
          <IconDownload className="share-icon" />
        </button>
        {canNativeShare && (
          <button
            type="button"
            className="share-icon-btn"
            title="Ещё"
            aria-label="Поделиться результатом иначе"
            onClick={() => void onNative('result')}
          >
            <IconMore className="share-icon" />
          </button>
        )}
      </div>
    </div>
  )
}
