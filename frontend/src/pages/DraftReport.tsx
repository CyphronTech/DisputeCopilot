import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { approveReport, getDraftReport } from '../api/client'
import { Confidence } from '../components/Confidence'
import { Icon } from '../components/Icon'
import type { DraftReport as DraftReportData } from '../api/types'

export function DraftReport() {
  const { caseId = '' } = useParams()
  const [report, setReport] = useState<DraftReportData | null>(null)

  useEffect(() => {
    getDraftReport(caseId).then(setReport)
  }, [caseId])

  if (!report) return null

  return (
    <>
      <Link className="back-link" to={`/cases/${caseId}`}>
        <Icon name="arrow-left" />
        Back to case
      </Link>
      <div className="page-head">
        <div>
          <h1 className="page-title">Draft report</h1>
          <p className="page-sub">Revision {report.revision} · {report.approved ? 'approved' : 'not yet approved'}</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost">Edit draft</button>
        </div>
      </div>

      <div className="report-grid">
        <div className="card doc">
          <h2>Case summary</h2>
          <p>{report.caseSummary}</p>

          <h2>Evidence index</h2>
          <ul>
            {report.evidenceIndex.map((e, i) => (
              <li key={i}>
                {e.text} <span className="cite-ref">{e.sourceRef}</span>
              </li>
            ))}
          </ul>

          <h2>Policy citations</h2>
          <p>{report.policyCitationsSummary}</p>

          <h2>Limitations</h2>
          <p>{report.limitations}</p>
        </div>

        <div className="side">
          <div className="card">
            <div className="meta-row">
              <span className="k">Recommendation</span>
              <span className="v">{report.recommendation}</span>
            </div>
            <div className="meta-row">
              <span className="k">Confidence</span>
              <Confidence value={report.confidence} />
            </div>
            <div className="meta-row">
              <span className="k">Policy version</span>
              <span className="v">{report.policyVersion}</span>
            </div>
            <div className="meta-row">
              <span className="k">Model</span>
              <span className="v">{report.model}</span>
            </div>
          </div>
          <div className="card">
            <div className="hash-label">Content hash (SHA-256)</div>
            <div className="hash">{report.contentHash}</div>
          </div>
          <div className="card actions">
            <button className="btn btn-primary" onClick={() => approveReport(caseId).then(setReport)}>
              <Icon name="check" />
              Approve this revision
            </button>
            <button className="btn btn-outline">Request changes</button>
          </div>
        </div>
      </div>
    </>
  )
}
