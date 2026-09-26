import { useEffect, useRef, useState } from 'react'
import { getPolicies, uploadPolicy } from '../api/client'
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
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const visible = policies.filter((doc) => filter === 'All types' || categoryOf(doc.title) === filter)

  function refresh() {
    return getPolicies().then((docs) => {
      setPolicies(docs)
      setSelected((current) => docs.find((d) => d.documentId === current?.documentId) ?? docs[0] ?? null)
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleUpload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      await uploadPolicy(file)
      await refresh()
    } catch (e) {
      setUploadError(`Could not upload policy: ${e}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="page-title">Policy library</h1>
          <p className="page-sub">Your return/refund policies — the AI cites these when making a recommendation</p>
        </div>
        <div className="head-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
          <button className="btn btn-primary" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <Icon name="upload" />
            {uploading ? 'Uploading…' : 'Upload policy'}
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="card" style={{ background: 'var(--error-dim)', color: 'var(--error)', marginBottom: 16, fontSize: 12.5 }}>
          {uploadError}
        </div>
      )}

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
          <div
            className="drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleUpload(e.dataTransfer.files?.[0])
            }}
          >
            <Icon name="upload" />
            <div>{uploading ? 'Uploading…' : 'Drop a PDF or TXT file, or browse'}</div>
          </div>
        </div>
      </div>
    </>
  )
}
