import { useEffect, useState } from 'react'
import {
  discoverSchema, getAllowlist, getConnectorConfig, getModelConfig, getShopifyConfig, getTableRoleMapping,
  saveAllowlist, saveConnectorConfig, saveModelConfig, saveShopifyConfig, saveTableRoleMapping, suggestTableMapping,
  testConnectorConfig, testModelConfig, testShopifyConfig,
} from '../api/client'
import type { RoleMapping } from '../api/client'
import { Icon } from '../components/Icon'
import type { ModelProvider } from '../api/types'

const TABS = ['Integrations', 'Users & roles', 'Deployment']

const ROLES = ['orders', 'payments', 'fulfillment', 'refunds', 'communications'] as const

const PROVIDER_DEFAULTS: Record<ModelProvider, { label: string; baseUrl: string; model: string }> = {
  anthropic: { label: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com', model: 'claude-3-5-haiku-20241022' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  local: { label: 'Local / self-hosted', baseUrl: 'http://localhost:11434/v1', model: 'llama3.1:8b-instruct-q4_K_M' },
}

export function Setup() {
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
  const [roleMapping, setRoleMapping] = useState<Record<string, RoleMapping>>({})
  const [suggestingMapping, setSuggestingMapping] = useState(false)
  const [savingMapping, setSavingMapping] = useState(false)
  const [mappingStatus, setMappingStatus] = useState<string | null>(null)

  const [connectorType, setConnectorType] = useState<'database' | 'shopify'>('database')
  const [shopDomain, setShopDomain] = useState('')
  const [shopifyToken, setShopifyToken] = useState('')
  const [shopifyConfigured, setShopifyConfigured] = useState(false)
  const [shopifyLastTested, setShopifyLastTested] = useState<string | null>(null)
  const [shopifyStatus, setShopifyStatus] = useState<string | null>(null)
  const [shopifySaving, setShopifySaving] = useState(false)

  useEffect(() => {
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
    getTableRoleMapping().then(setRoleMapping)
    getShopifyConfig().then((s) => {
      setShopifyConfigured(s.configured)
      if (s.configured) {
        setConnectorType('shopify')
        setShopDomain((s.shopDomain ?? '').replace('.myshopify.com', ''))
        setShopifyLastTested(s.lastTestedAt)
      }
    })
  }, [])

  async function handleSaveShopify() {
    setShopifySaving(true)
    setShopifyStatus(null)
    try {
      await saveShopifyConfig({ shopDomain, accessToken: shopifyToken })
      setShopifyConfigured(true)
      setShopifyToken('')
      setShopifyStatus('Saved')
    } catch (e) {
      setShopifyStatus(`Save failed: ${e}`)
    } finally {
      setShopifySaving(false)
    }
  }

  async function handleTestShopify() {
    setShopifyStatus('Testing…')
    const result = await testShopifyConfig()
    setShopifyStatus(result.ok ? 'Connected' : `Failed: ${result.message}`)
    if (result.ok) setShopifyLastTested(new Date().toISOString())
  }

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

  async function handleSuggestMapping() {
    setSuggestingMapping(true)
    setMappingStatus(null)
    try {
      const suggested = await suggestTableMapping()
      setRoleMapping(suggested)
      setMappingStatus('AI suggestion filled in below — review each one before saving.')
    } catch (e) {
      setMappingStatus(`Suggestion failed: ${e}`)
    } finally {
      setSuggestingMapping(false)
    }
  }

  function updateRoleMapping(role: string, field: keyof RoleMapping, value: string) {
    setRoleMapping((prev) => {
      const current = prev[role] ?? { tableName: '', orderIdColumn: '' }
      // Changing the table invalidates every column choice made against the old table.
      if (field === 'tableName') {
        return { ...prev, [role]: { tableName: value, orderIdColumn: '' } }
      }
      return { ...prev, [role]: { ...current, [field]: value } }
    })
  }

  async function handleSaveMapping() {
    setSavingMapping(true)
    try {
      const mapping = Object.fromEntries(
        Object.entries(roleMapping).filter(([, m]) => m.tableName && m.orderIdColumn),
      )
      const saved = await saveTableRoleMapping(mapping)
      setRoleMapping(saved)
      setMappingStatus('Mapping saved — the agent will use your table/column names from now on.')
    } catch (e) {
      setMappingStatus(`Save failed: ${e}`)
    } finally {
      setSavingMapping(false)
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
              <h2>Connect your store</h2>
            </div>
            <p className="desc">Choose how DisputeCopilot reads your order data.</p>
            <div className="row">
              <label>Store type</label>
              <select value={connectorType} onChange={(e) => setConnectorType(e.target.value as 'database' | 'shopify')}>
                <option value="database">Direct database (Postgres)</option>
                <option value="shopify">Shopify</option>
              </select>
            </div>
          </div>

          {connectorType === 'shopify' && (
            <div className="card section">
              <div className="section-head">
                <div className="section-icon">
                  <Icon name="db" />
                </div>
                <h2>Shopify</h2>
              </div>
              <p className="desc">
                In your Shopify admin: Settings → Apps and sales channels → Develop apps → Create an app →
                give it read access to Orders → install it → copy the Admin API access token here.
                The AI can only ever read orders, shipping, and refund info — it can never change anything in your store.
              </p>
              <div className="row">
                <label>Store domain</label>
                <input value={shopDomain} onChange={(e) => setShopDomain(e.target.value)} placeholder="your-store" />
              </div>
              <div className="row">
                <label>Access token</label>
                <input
                  value={shopifyToken}
                  onChange={(e) => setShopifyToken(e.target.value)}
                  type="password"
                  placeholder={shopifyConfigured ? '••••••••••••' : 'shpat_...'}
                />
              </div>
              <div className="row-actions">
                <div className={`status ${shopifyLastTested ? '' : 'pending'}`}>
                  <span className="dot" />
                  {shopifyStatus ?? (shopifyLastTested ? `Last tested ${new Date(shopifyLastTested).toLocaleString()}` : 'Not yet tested')}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleSaveShopify} disabled={shopifySaving || !shopDomain}>Save</button>
                <button className="btn btn-ghost btn-sm" onClick={handleTestShopify} disabled={!shopifyConfigured}>Test connection</button>
              </div>
            </div>
          )}

          {connectorType === 'database' && (
          <div className="card section">
            <div className="section-head">
              <div className="section-icon">
                <Icon name="db" />
              </div>
              <h2>Merchant database connector</h2>
            </div>
            <p className="desc">
              Connect your store's database directly. The AI can only ever read the tables/columns
              you approve below — nothing else, and it can never write or change anything.
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

            {schema && (
              <div style={{ marginTop: 18, borderTop: '1px solid var(--hairline-strong)', paddingTop: 14 }}>
                <p className="desc" style={{ marginTop: 0 }}>
                  Tell the app which of your tables play which role, and which column holds the order ID, so it
                  knows how to read your schema even if your table names don't match ours.
                </p>
                <button className="btn btn-ghost btn-sm" onClick={handleSuggestMapping} disabled={suggestingMapping} style={{ marginBottom: 12 }}>
                  {suggestingMapping ? 'Asking AI…' : 'Suggest mapping with AI'}
                </button>
                {ROLES.map((role) => (
                  <div className="row" key={role}>
                    <label style={{ textTransform: 'capitalize' }}>{role}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        value={roleMapping[role]?.tableName ?? ''}
                        onChange={(e) => updateRoleMapping(role, 'tableName', e.target.value)}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <option value="">— none —</option>
                        {Object.keys(schema).map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        value={roleMapping[role]?.orderIdColumn ?? ''}
                        onChange={(e) => updateRoleMapping(role, 'orderIdColumn', e.target.value)}
                        disabled={!roleMapping[role]?.tableName}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <option value="">order-id column</option>
                        {(schema[roleMapping[role]?.tableName ?? ''] ?? []).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    {role === 'orders' && roleMapping[role]?.tableName && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, gridColumn: '2 / -1' }}>
                        <select
                          value={roleMapping[role]?.customerNameColumn ?? ''}
                          onChange={(e) => updateRoleMapping(role, 'customerNameColumn', e.target.value)}
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <option value="">customer name column (optional)</option>
                          {(schema[roleMapping[role]?.tableName ?? ''] ?? []).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <select
                          value={roleMapping[role]?.customerEmailColumn ?? ''}
                          onChange={(e) => updateRoleMapping(role, 'customerEmailColumn', e.target.value)}
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <option value="">customer email column (optional)</option>
                          {(schema[roleMapping[role]?.tableName ?? ''] ?? []).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {role === 'refunds' && roleMapping[role]?.tableName && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, gridColumn: '2 / -1' }}>
                        <select
                          value={roleMapping[role]?.statusColumn ?? ''}
                          onChange={(e) => updateRoleMapping(role, 'statusColumn', e.target.value)}
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <option value="">status column (optional)</option>
                          {(schema[roleMapping[role]?.tableName ?? ''] ?? []).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input
                          value={roleMapping[role]?.issuedValue ?? ''}
                          onChange={(e) => updateRoleMapping(role, 'issuedValue', e.target.value)}
                          placeholder='value meaning "issued" (e.g. issued)'
                          style={{ flex: 1, minWidth: 0 }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <div className="row-actions">
                  <div className={`status ${mappingStatus ? '' : 'pending'}`}>
                    <span className="dot" />
                    {mappingStatus ?? 'AI suggestions are a starting point — review before saving'}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveMapping} disabled={savingMapping}>
                    {savingMapping ? 'Saving…' : 'Save mapping'}
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          <div className="card section">
            <div className="section-head">
              <div className="section-icon">
                <Icon name="clock" />
              </div>
              <h2>Merchant time zone</h2>
            </div>
            <p className="desc">Not built yet — will be used to compute the calendar date for policy effective-date filtering. Currently assumes IST for all merchants.</p>
          </div>
        </>
      )}

      {tab === 'Users & roles' && (
        <div className="card section">
          <p className="desc" style={{ marginTop: 0 }}>
            Not built yet — there's currently one shared admin account (set via the
            <span className="mono"> ADMIN_EMAIL</span>/<span className="mono">ADMIN_PASSWORD</span> environment
            variables). Per-person logins and permission levels aren't implemented.
          </p>
        </div>
      )}

      {tab === 'Deployment' && (
        <div className="card section">
          <p className="desc" style={{ marginTop: 0 }}>
            Not built yet — this instance runs from source (Docker + Java + Node) on whatever
            machine you start it on. There's no packaged installer or hosted option yet.
          </p>
        </div>
      )}
    </>
  )
}
