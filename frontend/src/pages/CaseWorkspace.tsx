import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCase, resolveManually } from '../api/client'
import { Confidence } from '../components/Confidence'
import { Icon } from '../components/Icon'
import { StateTag, Tag } from '../components/Tag'
import type { CaseDetail } from '../api/types'

export function CaseWorkspace() {
  const { caseId = '' } = useParams()
  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [note, setNote] = useState('')
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    getCase(caseId).then(setDetail)
  }, [caseId])

  if (!detail) return null

  async function handleResolve(recommendation: 'CONTEST' | 'ACCEPT') {
    setResolving(true)
    try {
      setDetail(await resolveManually(caseId, recommendation, note))
    } finally {
      setResolving(false)
    }
  }

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

      <div className="card" style={{ marginBottom: 16, background: 'var(--accent-dim, #eef4fc)' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-3)', marginBottom: 6 }}>In plain English</div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          {detail.summary ?? 'No summary available yet — the AI review either hasn’t run or didn’t produce one for this case.'}
        </p>
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
                {item.attachmentUrl && (
                  <a href={item.attachmentUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 8 }}>
                    <img
                      src={item.attachmentUrl}
                      alt={`Photo evidence for ${item.title}`}
                      style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, border: '1px solid var(--hairline-strong)', display: 'block' }}
                    />
                  </a>
                )}
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

          {detail.state === 'MANUAL_REVIEW_REQUIRED' && (
            <div className="card" style={{ marginTop: 12 }}>
              <h2 style={{ marginTop: 0 }}>Resolve manually</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>
                The agent could not reach a confident recommendation. Review the evidence above and decide yourself.
              </p>
              <textarea
                placeholder="Note (optional) — why you're making this call"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: '100%', minHeight: 60, marginTop: 8, marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" disabled={resolving} onClick={() => handleResolve('CONTEST')}>Contest</button>
                <button className="btn btn-outline" disabled={resolving} onClick={() => handleResolve('ACCEPT')}>Accept</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
