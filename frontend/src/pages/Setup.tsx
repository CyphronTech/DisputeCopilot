import { useEffect, useState } from 'react'
import {
  discoverSchema, getAllowlist, getConnectorConfig, getModelConfig, getSetupConfig,
  saveAllowlist, saveConnectorConfig, saveModelConfig, testConnectorConfig, testModelConfig,
} from '../api/client'
import { Icon } from '../components/Icon'
import type { ModelProvider, SetupConfig } from '../api/types'

const TABS = ['Integrations', 'Users & roles', 'Deployment']

const PROVIDER_DEFAULTS: Record<ModelProvider, { label: string; baseUrl: string; model: string }> = {
  anthropic: { label: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com', model: 'claude-3-5-haiku-20241022' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  local: { label: 'Local / self-hosted', baseUrl: 'http://localhost:11434/v1', model: 'llama3.1:8b-instruct-q4_K_M' },
}

export function Setup() {
  const [config, setConfig] = useState<SetupConfig | null>(null)
  const [tab, setTab] = useState(TABS[0])

  const [provider, setProvider] = useState<ModelProvider>('anthropic')
  const [baseUrl, setBaseUrl] = useState(PROVIDER_DEFAULTS.anthropic.baseUrl)
  const [model, setModel] = useState(PROVIDER_DEFAULTS.anthropic.model)
  const [apiKey, setApiKey] = useState('')
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [lastTested, setLastTested] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [dbHost, setDbHost] = useState('')
  const [dbPort, setDbPort] = useState('5432')
  const [dbDatabase, setDbDatabase] = useState('')
  const [dbUsername, setDbUsername] = useState('')
  const [dbPassword, setDbPassword] = useState('')
  const [dbConfigured, setDbConfigured] = useState(false)
  const [dbLastTested, setDbLastTested] = useState<string | null>(null)
  const [dbStatus, setDbStatus] = useState<string | null>(null)
  const [dbSaving, setDbSaving] = useState(false)
  const [schema, setSchema] = useState<Record<string, string[]> | null>(null)
  const [selectedColumns, setSelectedColumns] = useState<Record<string, Set<string>>>({})
  const [discovering, setDiscovering] = useState(false)
  const [savingAllowlist, setSavingAllowlist] = useState(false)

  useEffect(() => {
    getSetupConfig().then(setConfig)
    getModelConfig().then((m) => {
      if (m.provider) {
        setProvider(m.provider as ModelProvider)
        setBaseUrl(m.baseUrl)
        setModel(m.model)
      }
      setMaskedKey(m.maskedKey ?? null)
      setLastTested(m.lastTestedAt ?? null)
    })
    getConnectorConfig().then((c) => {
      setDbConfigured(c.configured)
      if (c.configured) {
        setDbHost(c.host ?? '')
        setDbPort(String(c.port ?? 5432))
        setDbDatabase(c.database ?? '')
        setDbUsername(c.username ?? '')
        setDbLastTested(c.lastTestedAt)
      }
    })
    getAllowlist().then((allowlist) => {
      if (Object.keys(allowlist).length > 0) {
        setSelectedColumns(Object.fromEntries(Object.entries(allowlist).map(([t, cols]) => [t, new Set(cols)])))
      }
    })
  }, [])

  async function handleSaveConnector() {
    setDbSaving(true)
    setDbStatus(null)
    try {
      await saveConnectorConfig({ host: dbHost, port: Number(dbPort), database: dbDatabase, username: dbUsername, password: dbPassword, driver: 'postgresql' })
      setDbConfigured(true)
      setDbPassword('')
      setDbStatus('Saved')
    } catch (e) {
      setDbStatus(`Save failed: ${e}`)
    } finally {
      setDbSaving(false)
    }
  }

  async function handleTestConnector() {
    setDbStatus('Testing…')
    const result = await testConnectorConfig()
    setDbStatus(result.ok ? 'Connected' : `Failed: ${result.message}`)
    if (result.ok) setDbLastTested(new Date().toISOString())
  }

  async function handleDiscoverSchema() {
    setDiscovering(true)
    setDbStatus(null)
    try {
      const discovered = await discoverSchema()
      setSchema(discovered)
    } catch (e) {
      setDbStatus(`Discovery failed: ${e}`)
    } finally {
      setDiscovering(false)
    }
  }

  function toggleColumn(table: string, column: string) {
    setSelectedColumns((prev) => {
      const next = { ...prev }
      const current = new Set(next[table] ?? [])
      if (current.has(column)) current.delete(column)
      else current.add(column)
      next[table] = current
      return next
    })
  }

  async function handleSaveAllowlist() {
    setSavingAllowlist(true)
    try {
      const allowlist = Object.fromEntries(
        Object.entries(selectedColumns).filter(([, cols]) => cols.size > 0).map(([t, cols]) => [t, [...cols]]),
      )
      await saveAllowlist(allowlist)
      setDbStatus('Allowlist saved — the agent will use these tables/columns from now on')
    } finally {
      setSavingAllowlist(false)
    }
  }

  function handleProviderChange(next: ModelProvider) {
    setProvider(next)
    setBaseUrl(PROVIDER_DEFAULTS[next].baseUrl)
    setModel(PROVIDER_DEFAULTS[next].model)
  }

  async function handleSave() {
    setSaving(true)
    setTestStatus(null)
    try {
      const saved = await saveModelConfig({ provider, baseUrl, apiKey, model })
      setMaskedKey(saved.maskedKey)
      setApiKey('')
      setTestStatus('Saved')
    } catch (e) {
      setTestStatus(`Save failed: ${e}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTestStatus('Testing…')
    const result = await testModelConfig()
    setTestStatus(result.ok ? 'Connected' : `Failed: ${result.message}`)
    if (result.ok) setLastTested(new Date().toISOString())
  }

  if (!config) return null

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="page-title">Setup</h1>
          <p className="page-sub">One-time configuration for this deployment</p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <span key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </span>
        ))}
      </div>

      {tab === 'Integrations' && (
        <>
          <div className="card section">
            <div className="section-head">
              <div className="section-icon">
                <Icon name="lock" />
              </div>
              <h2>Model provider</h2>
            </div>
            <p className="desc">Credentials stay on this server and are never shown again after saving.</p>
            <div className="row">
              <label>Provider</label>
              <select value={provider} onChange={(e) => handleProviderChange(e.target.value as ModelProvider)}>
                {Object.entries(PROVIDER_DEFAULTS).map(([value, p]) => (
                  <option key={value} value={value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="row">
              <label>Base URL</label>
              <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            </div>
            <div className="row">
              <label>Model</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
            <div className="row">
              <label>API key</label>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                placeholder={maskedKey ?? (provider === 'local' ? 'optional for local servers' : 'paste your API key')}
              />
            </div>
            <div className="row-actions">
              <div className={`status ${lastTested ? '' : 'pending'}`}>
                <span className="dot" />
                {testStatus ?? (lastTested ? `Last tested ${new Date(lastTested).toLocaleString()}` : 'Not yet tested')}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleSave} disabled={saving}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={handleTest}>Test connection</button>
            </div>
          </div>

          <div className="card section">
            <div className="section-head">
              <div className="section-icon">
                <Icon name="db" />
              </div>
              <h2>Merchant database connector</h2>
            </div>
            <p className="desc">
              Connect your store's database directly. Nothing here executes model-authored SQL —
              the agent only ever reads the tables/columns you approve below.
              {!dbConfigured && ' Leave this unset to keep using the built-in demo data.'}
            </p>
            <div className="row">
              <label>Host</label>
              <input value={dbHost} onChange={(e) => setDbHost(e.target.value)} placeholder="db.yourstore.com" />
            </div>
            <div className="row">
              <label>Port</label>
              <input value={dbPort} onChange={(e) => setDbPort(e.target.value)} placeholder="5432" />
            </div>
            <div className="row">
              <label>Database</label>
              <input value={dbDatabase} onChange={(e) => setDbDatabase(e.target.value)} placeholder="store_production" />
            </div>
            <div className="row">
              <label>Username</label>
              <input value={dbUsername} onChange={(e) => setDbUsername(e.target.value)} />
            </div>
            <div className="row">
              <label>Password</label>
              <input value={dbPassword} onChange={(e) => setDbPassword(e.target.value)} type="password" placeholder={dbConfigured ? '••••••••••••' : ''} />
            </div>
            <div className="row-actions">
              <div className={`status ${dbLastTested ? '' : 'pending'}`}>
                <span className="dot" />
                {dbStatus ?? (dbLastTested ? `Last tested ${new Date(dbLastTested).toLocaleString()}` : 'Not yet tested')}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleSaveConnector} disabled={dbSaving || !dbHost || !dbDatabase || !dbUsername}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={handleTestConnector} disabled={!dbConfigured}>Test connection</button>
              <button className="btn btn-ghost btn-sm" onClick={handleDiscoverSchema} disabled={discovering}>
                {discovering ? 'Scanning…' : 'Discover schema'}
              </button>
            </div>

            {schema && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--hairline-strong)', paddingTop: 14 }}>
                <p className="desc" style={{ marginTop: 0 }}>
                  Check the tables/columns the agent is allowed to read. Nothing else in this database is ever queried.
                </p>
                {Object.entries(schema).map(([table, columns]) => (
                  <div key={table} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{table}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                      {columns.map((col) => (
                        <label key={col} style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="checkbox"
                            checked={selectedColumns[table]?.has(col) ?? false}
                            onChange={() => toggleColumn(table, col)}
                          />
                          {col}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="btn btn-primary btn-sm" onClick={handleSaveAllowlist} disabled={savingAllowlist}>
                  {savingAllowlist ? 'Saving…' : 'Save allowlist'}
                </button>
              </div>
            )}
          </div>

          <div className="card section">
            <div className="section-head">
              <div className="section-icon">
                <Icon name="clock" />
              </div>
              <h2>Merchant time zone</h2>
            </div>
            <p className="desc">Not editable here yet — used to compute the calendar date for policy effective-date filtering once that's wired up.</p>
            <div className="row">
              <label>Time zone</label>
              <select defaultValue={config.timeZone} disabled>
                <option>{config.timeZone}</option>
              </select>
            </div>
          </div>
        </>
      )}
    </>
  )
}
