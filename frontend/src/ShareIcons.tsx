type IconProps = { className?: string }

const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconTelegram({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        {...stroke}
        d="M21 5 2.5 12.5l5.2 1.9M21 5l-3.2 14.2-6.6-5.1M21 5 7.7 14.4m0 0v4.1l2.9-3.2"
      />
    </svg>
  )
}

export function IconVk({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.8 17.5h-1.4c-3.1 0-4.9-2.1-5-5.6v-.2h1.7c.1 2.6.8 3.7 2.1 3.9V9.5h2v2.8c1.3-.1 2.6-1.4 3-2.8h1.7c-.5 1.9-1.9 3.3-3 3.9 1.2.5 2.8 1.7 3.4 3.9h-1.9c-.5-1.5-1.7-2.7-3.2-2.9v2.9h-.4z"
      />
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" {...stroke} fill="none" />
    </svg>
  )
}

export function IconCopy({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" {...stroke} />
      <path
        {...stroke}
        d="M15.5 8.5V6.8A2.3 2.3 0 0 0 13.2 4.5H6.8A2.3 2.3 0 0 0 4.5 6.8v6.4a2.3 2.3 0 0 0 2.3 2.3h1.7"
      />
    </svg>
  )
}

export function IconDownload({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M12 4.5v10m0 0 3.5-3.5M12 14.5 8.5 11" />
      <path {...stroke} d="M5 17.5v1a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-1" />
    </svg>
  )
}

export function IconMore({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6.5" cy="12" r="1.35" fill="currentColor" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
      <circle cx="17.5" cy="12" r="1.35" fill="currentColor" />
    </svg>
  )
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="m5.5 12.5 4 4 9-9" />
    </svg>
  )
}

export function IconQuote({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.5 17.5c-1.7 0-3-1.3-3-3.2 0-2.3 1.7-4.5 4.2-6.1l.7 1.1c-1.5 1-2.4 2.2-2.5 3.4.3-.2.7-.3 1.2-.3 1.4 0 2.4 1 2.4 2.3 0 1.4-1.1 2.8-3 2.8zm8.2 0c-1.7 0-3-1.3-3-3.2 0-2.3 1.7-4.5 4.2-6.1l.7 1.1c-1.5 1-2.4 2.2-2.5 3.4.3-.2.7-.3 1.2-.3 1.4 0 2.4 1 2.4 2.3 0 1.4-1.1 2.8-3 2.8z"
      />
    </svg>
  )
}
