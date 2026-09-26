import { useEffect, useState } from 'react'
import { getAuditEvents } from '../api/client'
import { Icon } from '../components/Icon'
import { downloadCsv } from '../lib/csv'
import type { AuditEvent } from '../api/types'

const TABS = ['All events', 'Workflow', 'Access', 'Configuration', 'Approval']

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [tab, setTab] = useState(TABS[0])

  useEffect(() => {
    getAuditEvents().then(setEvents)
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Compliance</p>
          <h1 className="page-title">Audit log</h1>
          <p className="page-sub">Append-only record of security and business events</p>
        </div>
        <div className="head-actions">
          <button
            className="btn btn-ghost"
            onClick={() => downloadCsv('audit-log.csv', events.map((e) => ({
              title: e.title, detail: e.detail, orderId: e.caseOrderId ?? '', actor: e.actorName, timestamp: e.timestamp,
            })))}
          >
            Export CSV
          </button>
        </div>
      </div>

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
            {events.map((e) => (
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
