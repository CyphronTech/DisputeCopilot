import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCase } from '../api/client'
import { Confidence } from '../components/Confidence'
import { Icon } from '../components/Icon'
import { StateTag, Tag } from '../components/Tag'
import type { CaseDetail } from '../api/types'

export function CaseWorkspace() {
  const { caseId = '' } = useParams()
  const [detail, setDetail] = useState<CaseDetail | null>(null)

  useEffect(() => {
    getCase(caseId).then(setDetail)
  }, [caseId])

  if (!detail) return null

  return (
    <>
      <Link className="back-link" to="/">
        <Icon name="arrow-left" />
        Back to cases
      </Link>
      <div className="case-head">
        <div>
          <div className="case-title">
            {detail.orderId} <span className="mono">{detail.customerName}</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <StateTag state={detail.state} />
          </div>
        </div>
        <Link className="text-link" to={`/cases/${caseId}/report`}>
          View draft report
          <Icon name="arrow-left" />
        </Link>
      </div>

      <div className="ws-grid">
        <div className="card panel">
          <div className="panel-head">
            <h2>Evidence timeline</h2>
          </div>
          {detail.evidence.map((item, i) => (
            <div className="t-item" key={i}>
              <div className={`t-icon ${item.kind === 'gap' ? 'warn' : ''}`}>
                <Icon name={item.kind === 'gap' ? 'alert' : item.kind === 'communication' ? 'user' : 'check'} />
              </div>
              <div className="t-time">{item.observedAt ?? '—'}</div>
              <div className="t-body">
                <strong>{item.title}</strong>
                <span className="desc">{item.description}</span>
                <span className="t-source">{item.sourceRef}</span>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="card panel">
            <div className="panel-head">
              <h2>Policy citations</h2>
            </div>
            {detail.citations.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>No policy retrieved yet.</p>}
            {detail.citations.map((c) => (
              <div className="cite" key={c.documentId}>
                <div className="cite-meta">
                  <span>{c.title}</span>
                  <span>v{c.version} · p.{c.page}</span>
                </div>
                <div className="cite-quote">&quot;{c.quote}&quot;</div>
              </div>
            ))}
          </div>

          <div className="card rec-card">
            <div className="rec-top">
              <span className="rec-label">Recommendation</span>
              {detail.recommendation ? (
                <Tag tone={detail.recommendation === 'MANUAL_REVIEW_REQUIRED' ? 'warn' : 'accent'}>{detail.recommendation}</Tag>
              ) : (
                <Tag tone="neutral">PENDING</Tag>
              )}
            </div>
            {detail.confidence != null && (
              <div className="rec-conf-row">
                <span className="lbl">Confidence</span>
                <Confidence value={detail.confidence} showLabel />
              </div>
            )}
            {detail.caveat && (
              <div className="caveat">
                <Icon name="alert" />
                {detail.caveat}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
