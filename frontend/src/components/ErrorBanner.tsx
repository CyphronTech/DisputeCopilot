/** Shared so a failed load or action is always visible, instead of leaving an empty page. */
export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      className="card"
      role="alert"
      style={{ background: 'var(--error-dim)', color: 'var(--error)', marginBottom: 16, fontSize: 12.5, padding: '10px 14px' }}
    >
      {message}
    </div>
  )
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function Loading({ what = 'Loading…' }: { what?: string }) {
  return <div style={{ padding: 40, color: 'var(--text-3)', fontSize: 13 }}>{what}</div>
}
