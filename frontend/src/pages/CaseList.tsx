import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createCase, getCaseMetrics, getCases } from '../api/client'
import { downloadCsv } from '../lib/csv'
import { Confidence } from '../components/Confidence'
import { Icon } from '../components/Icon'
import { StateTag, recommendationLabel } from '../components/Tag'
import type { CaseMetrics, CaseSummary } from '../api/types'

const FILTERS = ['All states', 'Awaiting approval', 'Manual review', 'Exported'] as const

export function CaseList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') ?? '').toLowerCase()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [metrics, setMetrics] = useState<CaseMetrics | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All states')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCases().then(setCases)
    getCaseMetrics().then(setMetrics)
  }, [])

  async function handleNewInvestigation() {
    const orderId = window.prompt('Order ID (e.g. ORD-2026-1042). This queries the merchant database live and runs the AI agent — it can take a few seconds.')
    if (!orderId) return
    setCreating(true)
    setError(null)
    try {
      const created = await createCase(orderId)
      navigate(`/cases/${created.caseId}`)
    } catch (e) {
      setError(`Could not create case: ${e}`)
    } finally {
      setCreating(false)
    }
  }

  function handleExport() {
    downloadCsv('cases.csv', visible.map((c) => ({
      orderId: c.orderId, customer: c.customerName, email: c.customerEmail,
      state: c.state, recommendation: c.recommendation ?? '', confidence: c.confidence ?? '', summary: c.summary ?? '', createdAt: c.createdAt,
    })))
  }

  const visible = cases
    .filter((c) => {
      if (filter === 'All states') return true
      if (filter === 'Awaiting approval') return c.state === 'AWAITING_HUMAN_APPROVAL'
      if (filter === 'Manual review') return c.state === 'MANUAL_REVIEW_REQUIRED'
      if (filter === 'Exported') return c.state === 'EXPORTED'
      return true
    })
    .filter((c) => !query || c.orderId.toLowerCase().includes(query) || c.customerName.toLowerCase().includes(query) || c.customerEmail.toLowerCase().includes(query))

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 className="page-title">Dispute cases</h1>
          <p className="page-sub">Product-not-received investigations</p>
        </div>
        <div className="head-actions">
          <a className="text-link" href="#export" onClick={(e) => { e.preventDefault(); handleExport() }}>Export list</a>
          <button className="btn btn-primary" onClick={handleNewInvestigation} disabled={creating}>
            <Icon name="plus" />
            {creating ? 'Running…' : 'New investigation'}
          </button>
        </div>
      </div>
      <p style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: -8, marginBottom: 16 }}>
        "New investigation" looks up the order in your store's records, then an AI reviews it and tells you whether to contest or accept the dispute — or flags it for you to decide.
      </p>
      {error && (
        <div className="card" style={{ background: 'var(--error-dim)', color: 'var(--error)', marginBottom: 16, fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {metrics && (
        <div className="metric-strip">
          <div className="metric">
            <div className="l"><Icon name="cases" />Open cases</div>
            <div className="n">{metrics.openCases}</div>
          </div>
          <div className="metric">
            <div className="l"><Icon name="clock" />Awaiting approval</div>
            <div className="n">{metrics.awaitingApproval}</div>
          </div>
          <div className="metric">
            <div className="l"><Icon name="alert" />Manual review</div>
            <div className="n">{metrics.manualReview}</div>
          </div>
          <div className="metric">
            <div className="l"><Icon name="check" />Exported without edits</div>
            <div className="n">{metrics.exportedWithoutEditsPct}<small>%</small></div>
          </div>
        </div>
      )}

      <div className="filters">
        {FILTERS.map((f) => (
          <span key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </span>
        ))}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>State</th>
              <th>Recommendation</th>
              <th style={{ minWidth: 280 }}>Summary (plain English)</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.caseId}>
                <td>
                  <Link className="order-id" to={`/cases/${c.caseId}`}>{c.orderId}</Link>
                </td>
                <td>
                  {c.customerName}
                  <span className="customer-sub">{c.customerEmail}</span>
                </td>
                <td>
                  <StateTag state={c.state} />
                </td>
                <td className="rec-cell">
                  {c.recommendation ? (
                    <>
                      <span className="rlabel">{recommendationLabel(c.recommendation)}</span>
                      <Confidence value={c.confidence ?? 0} />
                    </>
                  ) : (
                    <span className="rlabel" style={{ color: 'var(--text-3)' }}>No recommendation yet</span>
                  )}
                </td>
                <td style={{ color: 'var(--text-2)', fontSize: 12.5, maxWidth: 360, whiteSpace: 'normal' }}>
                  {c.summary ?? <span style={{ color: 'var(--text-3)' }}>Not available yet.</span>}
                </td>
                <td className="date">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}
