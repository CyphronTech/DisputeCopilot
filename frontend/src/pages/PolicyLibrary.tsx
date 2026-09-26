import { useEffect, useState } from 'react'
import { getPolicies } from '../api/client'
import { Icon } from '../components/Icon'
import { Tag } from '../components/Tag'
import type { PolicyDocument, PolicyStatus } from '../api/types'

const TYPE_FILTERS = ['All types', 'Terms & conditions', 'Shipping & delivery', 'Refund & replacement'] as const

function categoryOf(title: string): (typeof TYPE_FILTERS)[number] {
  const t = title.toLowerCase()
  if (t.includes('third-party') || t.includes('shipping') || t.includes('deliver')) return 'Shipping & delivery'
  if (t.includes('return') || t.includes('refund')) return 'Refund & replacement'
  return 'Terms & conditions'
}

const STATUS_TONE: Record<PolicyStatus, 'accent' | 'warn' | 'success' | 'neutral'> = {
  ACTIVE: 'success',
  RETIRED: 'neutral',
  INDEXING: 'warn',
  DRAFT: 'neutral',
  FAILED: 'warn',
}

export function PolicyLibrary() {
  const [policies, setPolicies] = useState<PolicyDocument[]>([])
  const [selected, setSelected] = useState<PolicyDocument | null>(null)
  const [filter, setFilter] = useState<(typeof TYPE_FILTERS)[number]>(TYPE_FILTERS[0])
  const visible = policies.filter((doc) => filter === 'All types' || categoryOf(doc.title) === filter)

  useEffect(() => {
    getPolicies().then((docs) => {
      setPolicies(docs)
      setSelected(docs[0] ?? null)
    })
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="page-title">Policy library</h1>
          <p className="page-sub">Versioned documents used for effective-date grounded retrieval</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" disabled title="Uploading new policy documents isn't implemented yet — these are seeded directly in the database">
            <Icon name="upload" />
            Upload policy
          </button>
        </div>
      </div>

      <div className="filters">
        {TYPE_FILTERS.map((f) => (
          <span key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </span>
        ))}
      </div>

      <div className="lib-grid">
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Version</th>
                <th>Effective</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={4} style={{ color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>No documents in this category.</td></tr>
              )}
              {visible.map((doc) => (
                <tr key={doc.documentId} onClick={() => setSelected(doc)} style={{ cursor: 'pointer' }}>
                  <td className="doc-name">
                    <div className="doc-icon">
                      <Icon name="file" />
                    </div>
                    <div>
                      <div className="doc-title">{doc.title}</div>
                      <div className="doc-sub">{doc.filename}</div>
                    </div>
                  </td>
                  <td className="mono">{doc.version}</td>
                  <td className="mono" style={{ color: 'var(--text-3)', fontSize: 12 }}>
                    {doc.effectiveFrom} {doc.effectiveTo === null ? '→ —' : `→ ${doc.effectiveTo}`}
                  </td>
                  <td>
                    <Tag tone={STATUS_TONE[doc.status]}>{doc.status}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          {selected && (
            <div className="card side-panel">
              <h2>{selected.title}</h2>
              {(selected.versions.length ? selected.versions : [selected]).map((v) => (
                <div className="ver-item" key={v.version}>
                  <span className="v">v{v.version}</span>
                  <Tag tone={STATUS_TONE[v.status]}>{v.status}</Tag>
                  <span className="dates">
                    {v.effectiveFrom} {v.effectiveTo === null ? '→ —' : `→ ${v.effectiveTo}`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="drop" style={{ opacity: 0.5 }} title="Not implemented yet">
            <Icon name="upload" />
            <div>Upload isn't wired up yet — policies are seeded directly for now</div>
          </div>
        </div>
      </div>
    </>
  )
}
