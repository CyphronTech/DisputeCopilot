import { useEffect, useRef, useState } from 'react'
import { deletePolicy, getPolicies, uploadPolicy } from '../api/client'
import { Icon } from '../components/Icon'
import { PolicyStatusTag } from '../components/Tag'
import { ErrorBanner } from '../components/ErrorBanner'
import type { PolicyDocument } from '../api/types'
import { formatDateTime } from '../lib/format'

const TYPE_FILTERS = ['All types', 'Terms & conditions', 'Shipping & delivery', 'Refund & replacement'] as const

function categoryOf(title: string): (typeof TYPE_FILTERS)[number] {
  const t = title.toLowerCase()
  if (t.includes('third-party') || t.includes('shipping') || t.includes('deliver')) return 'Shipping & delivery'
  if (t.includes('return') || t.includes('refund')) return 'Refund & replacement'
  return 'Terms & conditions'
}

function effective(from: string, to: string | null): string {
  return to === null ? `Since ${formatDateTime(from)}` : `${formatDateTime(from)} – ${formatDateTime(to)}`
}

export function PolicyLibrary() {
  const [policies, setPolicies] = useState<PolicyDocument[]>([])
  const [selected, setSelected] = useState<PolicyDocument | null>(null)
  const [filter, setFilter] = useState<(typeof TYPE_FILTERS)[number]>(TYPE_FILTERS[0])
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const visible = policies.filter((doc) => filter === 'All types' || categoryOf(doc.title) === filter)

  function refresh() {
    return getPolicies()
      .then((docs) => {
        setPolicies(docs)
        setSelected((current) => docs.find((d) => d.documentId === current?.documentId) ?? docs[0] ?? null)
      })
      .catch((e) => setUploadError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoaded(true))
  }

  useEffect(() => {
    refresh()
  }, [])

  // One request per file, in turn: a bad file (wrong type, no readable text) is reported by name
  // and the rest still go through, instead of one failure sinking the whole batch.
  async function handleUpload(fileList: FileList | null) {
    if (uploading !== null) return
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return
    setUploadError(null)
    const failures: string[] = []
    for (const [i, file] of files.entries()) {
      setUploading(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : 'Uploading…')
      try {
        await uploadPolicy(file)
      } catch (e) {
        failures.push(`${file.name}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    setUploading(null)
    await refresh()
    if (failures.length > 0) {
      const done = files.length - failures.length
      setUploadError(`${done > 0 ? `${done} uploaded. ` : ''}Couldn't upload ${failures.join(' · ')}`)
    }
  }

  async function handleDelete(doc: PolicyDocument) {
    if (deletingId !== null) return
    if (!window.confirm(`Remove "${doc.title}"? The AI will stop quoting it in new cases.`)) return
    setUploadError(null)
    setDeletingId(doc.documentId)
    try {
      await deletePolicy(doc.documentId)
      await refresh()
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Policies</p>
          <h1 className="page-title">Your policies</h1>
          <p className="page-sub">Your shipping, refund and terms documents — the AI quotes these when it makes a recommendation</p>
        </div>
        <div className="head-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              handleUpload(e.target.files)
              e.target.value = '' // so choosing the same file again still triggers an upload
            }}
          />
          <button className="btn btn-primary" disabled={uploading !== null} onClick={() => fileInputRef.current?.click()}>
            <Icon name="upload" />
            {uploading ?? 'Upload policies'}
          </button>
        </div>
      </div>

      <ErrorBanner message={uploadError} />

      <div className="filters" role="group" aria-label="Filter policies">
        {TYPE_FILTERS.map((f) => (
          <button key={f} type="button" className={`chip ${filter === f ? 'active' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <div className="lib-grid">
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Version</th>
                <th>In effect</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loaded && visible.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={5}>
                    {policies.length === 0 ? (
                      <div className="empty">
                        <h3>No policies uploaded yet</h3>
                        <p>
                          Upload your shipping, refund and terms &amp; conditions documents (PDF or plain text).
                          The AI quotes them as evidence when it recommends contesting or accepting a dispute.
                        </p>
                      </div>
                    ) : (
                      <div className="empty"><p>No documents in this category.</p></div>
                    )}
                  </td>
                </tr>
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
                  <td style={{ color: 'var(--text-3)', fontSize: 12 }}>
                    {effective(doc.effectiveFrom, doc.effectiveTo)}
                  </td>
                  <td>
                    <PolicyStatusTag status={doc.status} />
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      title={`Remove ${doc.title}`}
                      disabled={deletingId === doc.documentId}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(doc)
                      }}
                    >
                      {deletingId === doc.documentId ? 'Removing…' : 'Remove'}
                    </button>
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
                  <span className="v">Version {v.version}</span>
                  <PolicyStatusTag status={v.status} />
                  <span className="dates">{effective(v.effectiveFrom, v.effectiveTo)}</span>
                </div>
              ))}
            </div>
          )}
          <div
            className="drop"
            role="button"
            tabIndex={0}
            aria-label="Upload policy files"
            style={{ cursor: 'pointer' }}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleUpload(e.dataTransfer.files)
            }}
          >
            <Icon name="upload" />
            <div>{uploading ?? 'Drop PDF or text files here, or click to choose — you can pick several at once'}</div>
          </div>
        </div>
      </div>
    </>
  )
}
