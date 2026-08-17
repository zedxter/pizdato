import { useEffect, useState } from 'react'
import type { Stats } from './api'
import { downloadBadge, downloadVerticalBadge, renderBadgeCanvas } from './badge'
import type { Wisdom } from './quotes'
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconMore,
  IconTelegram,
  IconVk,
} from './ShareIcons'
import {
  buildQuoteCopyText,
  buildQuoteShareText,
  copyShareText,
  nativeShare,
  telegramShareUrl,
  vkShareUrl,
} from './share'

type Props = {
  stats: Stats
  wisdom: Wisdom
}

export function SharePanel({ stats, wisdom }: Props) {
  const [copied, setCopied] = useState(false)
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null)
  const [badgeBusy, setBadgeBusy] = useState(false)
  const [storiesBusy, setStoriesBusy] = useState(false)
  const shareText = buildQuoteShareText(wisdom)
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

  async function onCopy() {
    try {
      await copyShareText(buildQuoteCopyText(wisdom))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function onNative() {
    const ok = await nativeShare(shareText)
    if (!ok) await onCopy()
  }

  async function onDownloadBadge() {
    setBadgeBusy(true)
    try {
      await downloadBadge(stats, wisdom)
    } catch {
      // swallow — ошибка не критична, пользователь может попробовать снова
    } finally {
      setBadgeBusy(false)
    }
  }

  async function onDownloadStories() {
    setStoriesBusy(true)
    try {
      await downloadVerticalBadge(stats, wisdom)
    } catch {
      // swallow — ошибка не критична, пользователь может попробовать снова
    } finally {
      setStoriesBusy(false)
    }
  }

  return (
    <div className="share">
      <p className="share-heading">Кинь другу — пусть тоже выберет</p>

      {badgeUrl && (
        <img
          className="badge-preview"
          src={badgeUrl}
          alt="Бейдж результата pizdato"
          width={720}
          height={280}
        />
      )}

      <div className="share-actions" role="group" aria-label="Поделиться">
        <a
          className="share-icon-btn"
          href={telegramShareUrl(shareText)}
          target="_blank"
          rel="noopener noreferrer"
          title="Telegram"
          aria-label="Поделиться цитатой в Telegram"
        >
          <IconTelegram className="share-icon" />
        </a>
        <a
          className="share-icon-btn"
          href={vkShareUrl(shareText, 'Мудрость дня — pizdato')}
          target="_blank"
          rel="noopener noreferrer"
          title="VK"
          aria-label="Поделиться цитатой во ВКонтакте"
        >
          <IconVk className="share-icon" />
        </a>
        <button
          type="button"
          className="share-icon-btn"
          title={copied ? 'Скопировано' : 'Скопировать цитату'}
          aria-label={copied ? 'Скопировано' : 'Скопировать цитату'}
          onClick={() => void onCopy()}
        >
          {copied ? <IconCheck className="share-icon" /> : <IconCopy className="share-icon" />}
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
        <button
          type="button"
          className="share-icon-btn"
          title="Скачать бейдж для сторис"
          aria-label="Скачать бейдж для сторис"
          disabled={storiesBusy}
          onClick={() => void onDownloadStories()}
        >
          <svg className="share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="4" width="16" height="16" rx="4" />
            <path d="M4 15h4a4 4 0 0 1 4 4v1" />
          </svg>
        </button>
        {canNativeShare && (
          <button
            type="button"
            className="share-icon-btn"
            title="Ещё"
            aria-label="Поделиться иначе"
            onClick={() => void onNative()}
          >
            <IconMore className="share-icon" />
          </button>
        )}
      </div>

      <div className="share-links-row">
        <a
          className="share-channel-link"
          href="https://t.me/pizdato_net"
          target="_blank"
          rel="noopener noreferrer me"
        >
          <svg className="share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span>Подписаться на @pizdato_net</span>
        </a>

        <a
          className="share-sticker-link"
          href="https://t.me/addstickers/UncleMishaPiz"
          target="_blank"
          rel="noopener noreferrer me"
        >
          <span>📦 Стикеры дяди Миши</span>
        </a>
      </div>
    </div>
  )
}

