import { useEffect, useState } from 'react'
import type { Stats } from './api'
import { downloadBadge, renderBadgeCanvas } from './badge'
import {
  buildShareText,
  copyShareText,
  nativeShare,
  telegramShareUrl,
  vkShareUrl,
} from './share'

type Props = {
  stats: Stats
}

export function SharePanel({ stats }: Props) {
  const [copied, setCopied] = useState(false)
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null)
  const [badgeBusy, setBadgeBusy] = useState(false)
  const text = buildShareText(stats)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false

    void (async () => {
      try {
        const canvas = await renderBadgeCanvas(stats)
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
  }, [stats])

  async function onCopy() {
    try {
      await copyShareText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function onNative() {
    const ok = await nativeShare(text)
    if (!ok) await onCopy()
  }

  async function onDownloadBadge() {
    setBadgeBusy(true)
    try {
      await downloadBadge(stats)
    } finally {
      setBadgeBusy(false)
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
          width={640}
          height={160}
        />
      )}

      <div className="share-actions">
        <a
          className="share-btn share-tg"
          href={telegramShareUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Telegram
        </a>
        <a
          className="share-btn share-vk"
          href={vkShareUrl(text, stats.choice)}
          target="_blank"
          rel="noopener noreferrer"
        >
          VK
        </a>
        <button type="button" className="share-btn share-copy" onClick={() => void onCopy()}>
          {copied ? 'Скопировано' : 'Скопировать'}
        </button>
        <button
          type="button"
          className="share-btn share-badge"
          disabled={badgeBusy}
          onClick={() => void onDownloadBadge()}
        >
          {badgeBusy ? 'Готовим…' : 'Скачать бейдж PNG'}
        </button>
        {'share' in navigator && (
          <button type="button" className="share-btn share-more" onClick={() => void onNative()}>
            Ещё…
          </button>
        )}
      </div>
    </div>
  )
}
