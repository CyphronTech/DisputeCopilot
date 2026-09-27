import { useEffect, useState } from 'react'
import { getAuditEvents } from '../api/client'
import { Icon } from '../components/Icon'
import { ErrorBanner, messageOf } from '../components/ErrorBanner'
import { downloadCsv } from '../lib/csv'
import type { AuditEvent } from '../api/types'
import { formatDateTime } from '../lib/format'

const TABS = ['Everything', 'Cases', 'Sign-ins', 'Settings changes', 'Your decisions'] as const

function categoryOf(title: string): (typeof TABS)[number] {
  if (title.startsWith('Login')) return 'Sign-ins'
  if (title.includes('configuration')) return 'Settings changes'
  if (title.includes('approved') || title.includes('sent back for changes') || title.includes('resolved manually')) return 'Your decisions'
  return 'Cases'
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0])
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const visible = events.filter((e) => tab === 'Everything' || categoryOf(e.title) === tab)

  useEffect(() => {
    getAuditEvents().then(setEvents).catch((e) => setError(messageOf(e))).finally(() => setLoaded(true))
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">History</p>
          <h1 className="page-title">Activity log</h1>
          <p className="page-sub">A permanent record of who did what and when — useful if a payment processor asks how a decision was made</p>
        </div>
        <div className="head-actions">
          <button
            className="btn btn-ghost"
            disabled={visible.length === 0}
            onClick={() => downloadCsv('audit-log.csv', visible.map((e) => ({
              title: e.title, detail: e.detail, orderId: e.caseOrderId ?? '', who: e.actorName, when: formatDateTime(e.timestamp),
            })))}
          >
            Download (CSV)
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="filters" role="group" aria-label="Filter activity">
        {TABS.map((t) => (
          <button key={t} type="button" className={`chip ${tab === t ? 'active' : ''}`} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>What happened</th>
              <th>Order</th>
              <th>Who</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {loaded && visible.length === 0 && (
              <tr className="empty-row">
                <td colSpan={4}>
                  {events.length === 0 ? (
                    <div className="empty">
                      <h3>Nothing recorded yet</h3>
                      <p>
                        Every sign-in, settings change, investigation and approval will be listed here automatically.
                        Start an investigation from the Cases page to see your first entries.
                      </p>
                    </div>
                  ) : (
                    <div className="empty"><p>Nothing in this category yet.</p></div>
                  )}
                </td>
              </tr>
            )}
            {visible.map((e) => (
              <tr key={e.id}>
                <td className="event-cell">
                  <div className={`event-icon ${e.tone}`}>
                    <Icon name={e.icon} />
                  </div>
                  <div>
                    <div className="event-title">{e.title}</div>
                    <div className="event-detail">{e.detail}</div>
                  </div>
                </td>
                <td className="mono" style={{ color: e.caseOrderId ? undefined : 'var(--text-3)' }}>
                  {e.caseOrderId ?? '—'}
                </td>
                <td className="actor">
                  <div className="avatar" style={e.actorIsSystem ? { background: 'var(--accent-dim)', color: 'var(--accent-solid)' } : undefined}>
                    {e.actorInitials}
                  </div>
                  {e.actorName}
                </td>
                <td className="ts">{formatDateTime(e.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
