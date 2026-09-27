import { useEffect, useState } from 'react'
import { getAuditEvents } from '../api/client'
import { Icon } from '../components/Icon'
import { ErrorBanner, messageOf } from '../components/ErrorBanner'
import { downloadCsv } from '../lib/csv'
import type { AuditEvent } from '../api/types'

const TABS = ['All events', 'Workflow', 'Access', 'Configuration', 'Approval'] as const

function categoryOf(title: string): (typeof TABS)[number] {
  if (title.startsWith('Login')) return 'Access'
  if (title.includes('configuration')) return 'Configuration'
  if (title.includes('approved') || title.includes('sent back for changes') || title.includes('resolved manually')) return 'Approval'
  return 'Workflow'
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0])
  const [error, setError] = useState<string | null>(null)
  const visible = events.filter((e) => tab === 'All events' || categoryOf(e.title) === tab)

  useEffect(() => {
    getAuditEvents().then(setEvents).catch((e) => setError(messageOf(e)))
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Compliance</p>
          <h1 className="page-title">Audit log</h1>
          <p className="page-sub">A permanent record of who did what and when</p>
        </div>
        <div className="head-actions">
          <button
            className="btn btn-ghost"
            onClick={() => downloadCsv('audit-log.csv', visible.map((e) => ({
              title: e.title, detail: e.detail, orderId: e.caseOrderId ?? '', actor: e.actorName, timestamp: e.timestamp,
            })))}
          >
            Export CSV
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="filters">
        {TABS.map((t) => (
          <span key={t} className={`chip ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </span>
        ))}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Case</th>
              <th>Actor</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={4} style={{ color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>No events in this category.</td></tr>
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
                <td className="ts">{e.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
