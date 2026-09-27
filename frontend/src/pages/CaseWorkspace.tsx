import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createCase, getCase, resolveManually } from '../api/client'
import { Confidence } from '../components/Confidence'
import { Icon } from '../components/Icon'
import { StateTag, Tag, recommendationLabel } from '../components/Tag'
import { ErrorBanner, Loading, messageOf } from '../components/ErrorBanner'
import type { CaseDetail } from '../api/types'
import { evidenceDescription, evidenceTitle, formatDateTime, sourceLabel } from '../lib/format'

export function CaseWorkspace() {
  const { caseId = '' } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [note, setNote] = useState('')
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCase(caseId).then(setDetail).catch((e) => setError(messageOf(e)))
  }, [caseId])

  async function handleResolve(recommendation: 'CONTEST' | 'ACCEPT') {
    const question = recommendation === 'CONTEST'
      ? 'Contest this dispute? The case moves on with your decision to fight the chargeback.'
      : "Accept this dispute? The case moves on with your decision not to fight it — the customer keeps the refund."
    if (!window.confirm(question)) return
    setResolving(true)
    setError(null)
    try {
      setDetail(await resolveManually(caseId, recommendation, note))
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setResolving(false)
    }
  }

  // A failed case is closed, so starting the same order again opens a fresh investigation.
  async function handleRetry() {
    if (!detail) return
    setResolving(true)
    setError(null)
    try {
      const fresh = await createCase(detail.orderId)
      navigate(`/cases/${fresh.caseId}`)
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setResolving(false)
    }
  }

  if (!detail) {
    return (
      <>
        <Link className="back-link" to="/">
          <Icon name="arrow-left" />
          Back to cases
        </Link>
        <ErrorBanner message={error} />
        {!error && <Loading what="Loading case…" />}
      </>
    )
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
        <Link className="btn btn-ghost" to={`/cases/${caseId}/report`}>
          <Icon name="file" />
          View draft report
        </Link>
      </div>

      <ErrorBanner message={error} />

      <div className="card panel" style={{ marginBottom: 16, background: 'var(--accent-dim)' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-3)', marginBottom: 6 }}>In plain English</div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          {detail.summary ?? 'No summary available yet — the AI review either hasn’t run or didn’t produce one for this case.'}
        </p>
      </div>

      <div className="ws-grid">
        <div className="card panel">
          <div className="panel-head">
            <h2>What your records show</h2>
          </div>
          {detail.evidence.length === 0 && (
            <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>No records have been gathered for this order yet.</p>
          )}
          {detail.evidence.map((item, i) => {
            const source = sourceLabel(item.sourceRef)
            return (
            <div className="t-item" key={i}>
              <div className={`t-icon ${item.kind === 'gap' ? 'warn' : ''}`}>
                <Icon name={item.kind === 'gap' ? 'alert' : item.kind === 'communication' ? 'user' : 'check'} />
              </div>
              <div className="t-time">{item.observedAt ? formatDateTime(item.observedAt) : ''}</div>
              <div className="t-body">
                <strong>{evidenceTitle(item)}</strong>
                <span className="desc">{evidenceDescription(item)}</span>
                {source && <span className="t-source" title={item.sourceRef}>{source}</span>}
                {item.attachmentUrl && (
                  <a href={item.attachmentUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 8 }}>
                    <img
                      src={item.attachmentUrl}
                      alt={`Photo attached to ${evidenceTitle(item).toLowerCase()}`}
                      style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, border: '1px solid var(--hairline-strong)', display: 'block' }}
                    />
                  </a>
                )}
              </div>
            </div>
            )
          })}
        </div>

        <div>
          <div className="card panel">
            <div className="panel-head">
              <h2>From your policies</h2>
            </div>
            {detail.citations.length === 0 && (
              <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
                No matching policy was found. Add your shipping and refund policies under{' '}
                <Link to="/policies" style={{ color: 'var(--accent-solid)' }}>Your policies</Link> so the AI can quote them.
              </p>
            )}
            {detail.citations.map((c) => (
              <div className="cite" key={c.documentId}>
                <div className="cite-meta">
                  <span>{c.title}</span>
                  <span>Version {c.version} · page {c.page}</span>
                </div>
                <div className="cite-quote">&quot;{c.quote}&quot;</div>
              </div>
            ))}
          </div>

          <div className="card rec-card">
            <div className="rec-top">
              <span className="rec-label">AI recommendation</span>
              {detail.recommendation ? (
                <Tag tone={detail.recommendation === 'MANUAL_REVIEW_REQUIRED' ? 'warn' : 'accent'}>{recommendationLabel(detail.recommendation)}</Tag>
              ) : (
                <Tag tone="neutral">Not ready yet</Tag>
              )}
            </div>
            {detail.confidence != null && (
              <div className="rec-conf-row">
                <span className="lbl">How sure the AI is</span>
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

          {detail.state === 'FAILED' && (
            <div className="card panel" style={{ marginTop: 12 }}>
              <h2 style={{ marginTop: 0 }}>This investigation didn't finish</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>
                The reason is shown above. Once you've fixed it (usually in <Link to="/setup">Setup</Link>), try again.
              </p>
              <button className="btn btn-primary" disabled={resolving} onClick={handleRetry}>Try again</button>
            </div>
          )}

          {detail.state === 'MANUAL_REVIEW_REQUIRED' && (
            <div className="card panel" style={{ marginTop: 12 }}>
              <h2 style={{ marginTop: 0 }}>Your decision</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>
                The AI couldn't reach a confident decision on this one. Look over the records above and decide yourself.
              </p>
              <label htmlFor="resolve-note" className="hint">Note for your records (optional)</label>
              <textarea
                id="resolve-note"
                className="input"
                placeholder="Why you're making this call"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: '100%', minHeight: 60, marginTop: 8, marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" disabled={resolving} onClick={() => handleResolve('CONTEST')}>Contest the dispute</button>
                <button className="btn btn-outline" disabled={resolving} onClick={() => handleResolve('ACCEPT')}>Accept the dispute</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
