import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { approveReport, getDraftReport, requestReportChanges } from '../api/client'
import { Confidence } from '../components/Confidence'
import { Icon } from '../components/Icon'
import { recommendationLabel } from '../components/Tag'
import { ErrorBanner, Loading, messageOf } from '../components/ErrorBanner'
import type { DraftReport as DraftReportData } from '../api/types'
import { reportEvidenceLine, sourceLabel } from '../lib/format'

export function DraftReport() {
  const { caseId = '' } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState<DraftReportData | null>(null)
  const [changesNote, setChangesNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getDraftReport(caseId).then(setReport).catch((e) => setError(messageOf(e)))
  }, [caseId])

  async function handleSubmitChanges() {
    if (!window.confirm('Send this report back? The case returns to "Needs your review" so you can decide it yourself.')) return
    setError(null)
    setBusy(true)
    try {
      await requestReportChanges(caseId, changesNote ?? '')
      navigate(`/cases/${caseId}`)
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove() {
    if (!window.confirm('Approve this report? The case is marked approved and your approval is recorded in the activity log.')) return
    setError(null)
    setBusy(true)
    try {
      setReport(await approveReport(caseId))
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  if (!report) {
    return (
      <>
        <Link className="back-link" to={`/cases/${caseId}`}>
          <Icon name="arrow-left" />
          Back to case
        </Link>
        <ErrorBanner message={error} />
        {!error && <Loading what="Loading report…" />}
      </>
    )
  }

  return (
    <>
      <Link className="back-link" to={`/cases/${caseId}`}>
        <Icon name="arrow-left" />
        Back to case
      </Link>
      <div className="page-head">
        <div>
          <h1 className="page-title">Draft report</h1>
          <p className="page-sub">Draft {report.revision} · {report.approved ? 'Approved' : 'Waiting for your approval'}</p>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="report-grid">
        <div className="card doc">
          <h2>Case summary</h2>
          <p>{report.caseSummary}</p>

          <h2>Evidence from your records</h2>
          <ul>
            {report.evidenceIndex.map((e, i) => (
              <li key={i}>
                {reportEvidenceLine(e.text, e.sourceRef)} <span className="cite-ref" title={e.sourceRef}>{sourceLabel(e.sourceRef)}</span>
              </li>
            ))}
          </ul>

          <h2>What your policy says</h2>
          <p>{report.policyCitationsSummary}</p>

          <h2>What this report can't show</h2>
          <p>{report.limitations}</p>
        </div>

        <div className="side">
          <div className="card">
            <div className="meta-row">
              <span className="k">AI recommendation</span>
              <span className="v">{recommendationLabel(report.recommendation)}</span>
            </div>
            <div className="meta-row">
              <span className="k">How sure the AI is</span>
              <Confidence value={report.confidence} />
            </div>
            <div className="meta-row">
              <span className="k">Policy version used</span>
              <span className="v">{report.policyVersion}</span>
            </div>
            <div className="meta-row">
              <span className="k">AI model</span>
              <span className="v">{report.model}</span>
            </div>
          </div>
          <div className="card">
            <div className="hash-label">Report fingerprint</div>
            <div className="hash">{report.contentHash}</div>
            <p className="hint">A unique code for this exact wording. If the report is changed later, the code changes too — proof it wasn't edited.</p>
          </div>
          <div className="card actions">
            {report.approved ? (
              <div className="status"><span className="dot" />You approved this report.</div>
            ) : (
              <button className="btn btn-primary" onClick={handleApprove} disabled={busy}>
                <Icon name="check" />
                Approve this report
              </button>
            )}
            {report.approved ? null : changesNote === null ? (
              <button className="btn btn-outline" onClick={() => setChangesNote('')} disabled={busy}>Something's wrong — send back</button>
            ) : (
              <>
                <label htmlFor="changes-note" className="hint">What needs to change?</label>
                <textarea
                  id="changes-note"
                  className="input"
                  autoFocus
                  placeholder="This sends the case back to you for review."
                  value={changesNote}
                  onChange={(e) => setChangesNote(e.target.value)}
                  style={{ width: '100%', minHeight: 60 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, width: 'auto' }} onClick={handleSubmitChanges} disabled={busy || !changesNote.trim()}>Send back</button>
                  <button className="btn btn-ghost" style={{ flex: 1, width: 'auto' }} onClick={() => setChangesNote(null)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
