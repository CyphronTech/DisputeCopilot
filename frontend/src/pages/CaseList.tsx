import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createCase, getCaseMetrics, getCases, getConnectorConfig, getModelConfig, getShopifyConfig } from '../api/client'
import { downloadCsv } from '../lib/csv'
import { Confidence } from '../components/Confidence'
import { Icon } from '../components/Icon'
import { StateTag, recommendationLabel, stateLabel } from '../components/Tag'
import { formatDateTime } from '../lib/format'
import { ErrorBanner, messageOf } from '../components/ErrorBanner'
import type { CaseMetrics, CaseSummary } from '../api/types'

const FILTERS = ['All cases', 'Needs your approval', 'Needs your review', 'Done'] as const

export function CaseList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') ?? '').toLowerCase()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [metrics, setMetrics] = useState<CaseMetrics | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All cases')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newOrderId, setNewOrderId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  // null = unknown (still loading, or the check failed) — only warn when we know it's missing.
  const [aiReady, setAiReady] = useState<boolean | null>(null)
  const [storeReady, setStoreReady] = useState<boolean | null>(null)

  useEffect(() => {
    getCases().then(setCases).catch((e) => setError(messageOf(e))).finally(() => setLoaded(true))
    getCaseMetrics().then(setMetrics).catch((e) => setError(messageOf(e)))
    getModelConfig().then((m) => setAiReady(Boolean(m.provider))).catch(() => {})
    Promise.all([getConnectorConfig(), getShopifyConfig()])
      .then(([db, shop]) => setStoreReady(db.configured || shop.configured))
      .catch(() => {})
  }, [])

  async function handleNewInvestigation() {
    if (creating || !newOrderId?.trim()) return
    setCreating(true)
    setError(null)
    try {
      const created = await createCase(newOrderId.trim())
      navigate(`/cases/${created.caseId}`)
      setNewOrderId(null)
    } catch (e) {
      setError(`Couldn't start the investigation: ${messageOf(e)}`)
    } finally {
      setCreating(false)
    }
  }

  function handleExport() {
    downloadCsv('cases.csv', visible.map((c) => ({
      orderId: c.orderId, customer: c.customerName, email: c.customerEmail,
      status: stateLabel(c.state), recommendation: c.recommendation ? recommendationLabel(c.recommendation) : '',
      confidence: c.confidence ?? '', summary: c.summary ?? '', opened: formatDateTime(c.createdAt),
    })))
  }

  const visible = cases
    .filter((c) => {
      if (filter === 'Needs your approval') return c.state === 'AWAITING_HUMAN_APPROVAL'
      if (filter === 'Needs your review') return c.state === 'MANUAL_REVIEW_REQUIRED'
      if (filter === 'Done') return c.state === 'APPROVED' || c.state === 'EXPORTED'
      return true
    })
    .filter((c) => !query || c.orderId.toLowerCase().includes(query) || c.customerName.toLowerCase().includes(query) || c.customerEmail.toLowerCase().includes(query))

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Cases</p>
          <h1 className="page-title">Dispute cases</h1>
          <p className="page-sub">Chargebacks where the customer says their order never arrived</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={handleExport} disabled={visible.length === 0}>Download list (CSV)</button>
          {newOrderId === null ? (
            <button
              className="btn btn-primary"
              onClick={() => setNewOrderId('')}
              disabled={aiReady === false || storeReady === false}
              title={aiReady === false ? 'Set up an AI provider in Setup first' : storeReady === false ? 'Connect your store in Setup first' : undefined}
            >
              <Icon name="plus" />
              New investigation
            </button>
          ) : (
            <>
              <label className="sr-only" htmlFor="new-order-id">Order ID</label>
              <input
                id="new-order-id"
                className="input"
                autoFocus
                placeholder="Order ID (e.g. ORD-2026-1042)"
                value={newOrderId}
                onChange={(e) => setNewOrderId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNewInvestigation()}
                style={{ width: 220 }}
              />
              <button className="btn btn-primary" onClick={handleNewInvestigation} disabled={creating || !newOrderId.trim()}>
                {creating ? 'Investigating… (up to a minute)' : 'Start'}
              </button>
              <button className="btn btn-ghost" onClick={() => setNewOrderId(null)} disabled={creating}>Cancel</button>
            </>
          )}
        </div>
      </div>
      <p style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: -8, marginBottom: 16 }}>
        "New investigation" looks up the order in your store's records, then an AI reviews it and tells you whether to contest or accept the dispute — or flags it for you to decide.
      </p>
      {aiReady === false && (
        <div className="card notice" role="status">
          <Icon name="alert" />
          <div>
            <strong>One step before your first investigation:</strong> connect an AI provider so the app can review your orders.{' '}
            <Link to="/setup">Go to Setup</Link>
          </div>
        </div>
      )}
      {aiReady !== false && storeReady === false && (
        <div className="card notice info" role="status">
          <Icon name="db" />
          <div>
            <strong>One step before your first investigation:</strong> connect your store so the app can look up your orders.{' '}
            <Link to="/setup">Connect your store</Link>
          </div>
        </div>
      )}
      <ErrorBanner message={error} />

      {metrics && (
        <div className="metric-strip">
          <div className="metric">
            <div className="l"><Icon name="cases" />Open cases</div>
            <div className="n">{metrics.openCases}</div>
          </div>
          <div className="metric">
            <div className="l"><Icon name="clock" />Waiting for your approval</div>
            <div className="n">{metrics.awaitingApproval}</div>
          </div>
          <div className="metric">
            <div className="l"><Icon name="alert" />Needs your review</div>
            <div className="n">{metrics.manualReview}</div>
          </div>
          <div className="metric">
            <div className="l"><Icon name="check" />Reports downloaded</div>
            <div className="n">{metrics.reportsDownloaded}</div>
          </div>
        </div>
      )}

      <div className="filters" role="group" aria-label="Filter cases">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`chip ${filter === f ? 'active' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Recommendation</th>
              <th style={{ minWidth: 280 }}>Summary</th>
              <th>Opened</th>
            </tr>
          </thead>
          <tbody>
            {loaded && visible.length === 0 && (
              <tr className="empty-row">
                <td colSpan={6}>
                  {cases.length === 0 ? (
                    <div className="empty">
                      <h3>No dispute cases yet</h3>
                      <p>
                        When a customer files a chargeback, click <strong>New investigation</strong> and type the order ID.
                        The app gathers the order's records and suggests whether to fight or accept the dispute.
                      </p>
                    </div>
                  ) : (
                    <div className="empty"><p>No cases match{query ? ` "${query}"` : ''} under "{filter}".</p></div>
                  )}
                </td>
              </tr>
            )}
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
                <td className="date">{formatDateTime(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
