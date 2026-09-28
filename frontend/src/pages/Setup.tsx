import { useEffect, useState } from 'react'
import {
  changePassword, discoverSchema, getAllowlist, getConnectorConfig, getModelConfig, getShopifyConfig, getTableRoleMapping,
  restoreBackup, saveAllowlist, saveConnectorConfig, saveModelConfig, saveShopifyConfig, saveTableRoleMapping, suggestTableMapping,
  testConnectorConfig, testModelConfig, testShopifyConfig,
} from '../api/client'
import type { RoleMapping } from '../api/client'
import { Icon } from '../components/Icon'
import { ErrorBanner, messageOf } from '../components/ErrorBanner'
import { formatDateTime } from '../lib/format'
import type { ModelProvider } from '../api/types'

const TABS = ['Integrations', 'Password', 'Backup']

const ROLES = ['orders', 'payments', 'fulfillment', 'refunds', 'returns', 'communications', 'customers'] as const
const ROLE_LABEL: Record<(typeof ROLES)[number], string> = {
  orders: 'Orders', payments: 'Payments', fulfillment: 'Shipping & delivery', refunds: 'Refunds', returns: 'Returns', communications: 'Customer messages',
  customers: 'Customers (names & emails)',
}

const PROVIDER_DEFAULTS: Record<ModelProvider, { label: string; baseUrl: string; model: string }> = {
  anthropic: { label: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com', model: 'claude-haiku-4-5' },
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
  const [testing, setTesting] = useState(false)

  const [dbHost, setDbHost] = useState('')
  const [dbPort, setDbPort] = useState('5432')
  const [dbDatabase, setDbDatabase] = useState('')
  const [dbUsername, setDbUsername] = useState('')
  const [dbPassword, setDbPassword] = useState('')
  const [dbConfigured, setDbConfigured] = useState(false)
  const [dbLastTested, setDbLastTested] = useState<string | null>(null)
  const [dbStatus, setDbStatus] = useState<string | null>(null)
  const [dbSaving, setDbSaving] = useState(false)
  const [dbTesting, setDbTesting] = useState(false)
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
  const [shopifyTesting, setShopifyTesting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const onError = (e: unknown) => setLoadError(`Couldn't load your saved settings: ${messageOf(e)}`)
    getModelConfig().then((m) => {
      if (m.provider) {
        setProvider(m.provider as ModelProvider)
        setBaseUrl(m.baseUrl)
        setModel(m.model)
      }
      setMaskedKey(m.maskedKey ?? null)
      setLastTested(m.lastTestedAt ?? null)
    }).catch(onError)
    getConnectorConfig().then((c) => {
      setDbConfigured(c.configured)
      if (c.configured) {
        setDbHost(c.host ?? '')
        setDbPort(String(c.port ?? 5432))
        setDbDatabase(c.database ?? '')
        setDbUsername(c.username ?? '')
        setDbLastTested(c.lastTestedAt)
      }
    }).catch(onError)
    getAllowlist().then((allowlist) => {
      if (Object.keys(allowlist).length > 0) {
        setSelectedColumns(Object.fromEntries(Object.entries(allowlist).map(([t, cols]) => [t, new Set(cols)])))
      }
    }).catch(onError)
    getTableRoleMapping().then(setRoleMapping).catch(onError)
    getShopifyConfig().then((s) => {
      setShopifyConfigured(s.configured)
      if (s.configured) {
        setConnectorType('shopify')
        setShopDomain((s.shopDomain ?? '').replace('.myshopify.com', ''))
        setShopifyLastTested(s.lastTestedAt)
      }
    }).catch(onError)
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
      setShopifyStatus(`Couldn't save: ${messageOf(e)}`)
    } finally {
      setShopifySaving(false)
    }
  }

  async function handleTestShopify() {
    if (shopifyTesting) return
    setShopifyTesting(true)
    setShopifyStatus('Testing…')
    try {
      const result = await testShopifyConfig()
      setShopifyStatus(result.ok ? 'Connected — working' : `Couldn't connect: ${result.message}`)
      if (result.ok) setShopifyLastTested(new Date().toISOString())
    } catch (e) {
      setShopifyStatus(`Couldn't connect: ${messageOf(e)}`)
    } finally {
      setShopifyTesting(false)
    }
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
      setDbStatus(`Couldn't save: ${messageOf(e)}`)
    } finally {
      setDbSaving(false)
    }
  }

  async function handleTestConnector() {
    if (dbTesting) return
    setDbTesting(true)
    setDbStatus('Testing…')
    try {
      const result = await testConnectorConfig()
      setDbStatus(result.ok ? 'Connected — working' : `Couldn't connect: ${result.message}`)
      if (result.ok) setDbLastTested(new Date().toISOString())
    } catch (e) {
      setDbStatus(`Couldn't connect: ${messageOf(e)}`)
    } finally {
      setDbTesting(false)
    }
  }

  async function handleDiscoverSchema() {
    setDiscovering(true)
    setDbStatus(null)
    try {
      const discovered = await discoverSchema()
      setSchema(discovered)
    } catch (e) {
      setDbStatus(`Couldn't load your tables: ${messageOf(e)}`)
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

  function toggleAllInTable(table: string, columns: string[]) {
    setSelectedColumns((prev) => {
      const allSelected = columns.every((c) => prev[table]?.has(c))
      return { ...prev, [table]: new Set(allSelected ? [] : columns) }
    })
  }

  function toggleAllTables(select: boolean) {
    if (!schema) return
    setSelectedColumns(
      select ? Object.fromEntries(Object.entries(schema).map(([t, cols]) => [t, new Set(cols)])) : {},
    )
  }

  async function handleSaveAllowlist() {
    setSavingAllowlist(true)
    try {
      const allowlist = Object.fromEntries(
        Object.entries(selectedColumns).filter(([, cols]) => cols.size > 0).map(([t, cols]) => [t, [...cols]]),
      )
      await saveAllowlist(allowlist)
      setDbStatus('Saved — the AI will only read the columns you ticked')
    } catch (e) {
      setDbStatus(`Couldn't save: ${messageOf(e)}`)
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
      setMappingStatus(`Couldn't get a suggestion: ${messageOf(e)}`)
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
      setMappingStatus('Saved — the app now knows where to find each kind of record.')
    } catch (e) {
      setMappingStatus(`Couldn't save: ${messageOf(e)}`)
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
      setTestStatus(`Couldn't save: ${messageOf(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (testing) return
    setTesting(true)
    setTestStatus('Testing…')
    try {
      const result = await testModelConfig()
      setTestStatus(result.ok ? 'Connected — working' : `Couldn't connect: ${result.message}`)
      if (result.ok) setLastTested(new Date().toISOString())
    } catch (e) {
      setTestStatus(`Couldn't connect: ${messageOf(e)}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="page-title">Setup</h1>
          <p className="page-sub">
            One-time setup, in three steps: <strong>1.</strong> choose an AI provider, <strong>2.</strong> connect your store,{' '}
            <strong>3.</strong> choose which order details the AI may read. You can come back and change these any time.
          </p>
        </div>
      </div>

      <ErrorBanner message={loadError} />

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Integrations' && (
        <>
          <div className="card section">
            <div className="section-head">
              <span className="step-num">1</span>
              <h2>Choose your AI provider</h2>
            </div>
            <p className="desc">
              The AI reads each disputed order and writes a recommendation. Pick the company you have an account with,
              paste the API key from their website, click <strong>Save</strong>, then <strong>Test connection</strong>.
              Leave the server address and AI model as they are unless your provider told you otherwise.
              Your key stays on this computer and is never shown again after saving.
            </p>
            <div className="row">
              <label htmlFor="setup-provider">Provider</label>
              <select id="setup-provider" value={provider} onChange={(e) => handleProviderChange(e.target.value as ModelProvider)}>
                {Object.entries(PROVIDER_DEFAULTS).map(([value, p]) => (
                  <option key={value} value={value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="row">
              <label htmlFor="setup-base-url">Server address</label>
              <input id="setup-base-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="setup-model">AI model</label>
              <input id="setup-model" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="setup-api-key">API key</label>
              <input
                id="setup-api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                placeholder={maskedKey ? `Saved (${maskedKey}) — paste a new key to replace it` : provider === 'local' ? 'optional for local servers' : 'paste your API key'}
              />
            </div>
            <div className="row-actions">
              <div className={`status ${lastTested ? '' : 'pending'}`}>
                <span className="dot" />
                {testStatus ?? (lastTested ? `Working — last checked ${formatDateTime(lastTested)}` : 'Not set up yet')}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleSave} disabled={saving}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={handleTest} disabled={testing}>Test connection</button>
            </div>
          </div>

          <div className="card section">
            <div className="section-head">
              <span className="step-num">2</span>
              <h2>Connect your store</h2>
            </div>
            <p className="desc">
              Tell Proofly where your orders live so it can look them up. Access is read-only — it can never change,
              delete or add anything in your store. Until you connect, investigations use built-in sample data.
            </p>
            <div className="row">
              <label htmlFor="setup-store-type">Where are your orders?</label>
              <select id="setup-store-type" value={connectorType} onChange={(e) => setConnectorType(e.target.value as 'database' | 'shopify')}>
                <option value="database">My own database (PostgreSQL)</option>
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
                <label htmlFor="setup-shop-domain">Store name</label>
                <input id="setup-shop-domain" value={shopDomain} onChange={(e) => setShopDomain(e.target.value)} placeholder="your-store (from your-store.myshopify.com)" />
              </div>
              <div className="row">
                <label htmlFor="setup-shop-token">Access token</label>
                <input
                  id="setup-shop-token"
                  value={shopifyToken}
                  onChange={(e) => setShopifyToken(e.target.value)}
                  type="password"
                  placeholder={shopifyConfigured ? '••••••••••••' : 'shpat_...'}
                />
              </div>
              <div className="row-actions">
                <div className={`status ${shopifyLastTested ? '' : 'pending'}`}>
                  <span className="dot" />
                  {shopifyStatus ?? (shopifyLastTested ? `Working — last checked ${formatDateTime(shopifyLastTested)}` : shopifyConfigured ? 'Saved — click Test connection' : 'Not connected yet')}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleSaveShopify} disabled={shopifySaving || !shopDomain}>Save</button>
                <button className="btn btn-ghost btn-sm" onClick={handleTestShopify} disabled={!shopifyConfigured || shopifyTesting}>Test connection</button>
              </div>
            </div>
          )}

          {connectorType === 'database' && (
          <div className="card section">
            <div className="section-head">
              <div className="section-icon">
                <Icon name="db" />
              </div>
              <h2>Your store's database</h2>
            </div>
            <p className="desc">
              Enter the connection details for your store's database — your developer or hosting provider can give you these.
              Then click <strong>Save</strong>, <strong>Test connection</strong>, and <strong>Load my tables</strong> to go to step 3.
              {!dbConfigured && ' Leave this empty to keep using the built-in sample data.'}
            </p>
            <div className="row">
              <label htmlFor="setup-db-host">Server address (host)</label>
              <input id="setup-db-host" value={dbHost} onChange={(e) => setDbHost(e.target.value)} placeholder="db.yourstore.com" />
            </div>
            <div className="row">
              <label htmlFor="setup-db-port">Port</label>
              <input id="setup-db-port" inputMode="numeric" value={dbPort} onChange={(e) => setDbPort(e.target.value)} placeholder="5432" />
            </div>
            <div className="row">
              <label htmlFor="setup-db-name">Database name</label>
              <input id="setup-db-name" value={dbDatabase} onChange={(e) => setDbDatabase(e.target.value)} placeholder="store_production" />
            </div>
            <div className="row">
              <label htmlFor="setup-db-user">Username</label>
              <input id="setup-db-user" value={dbUsername} onChange={(e) => setDbUsername(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="setup-db-password">Password</label>
              <input id="setup-db-password" value={dbPassword} onChange={(e) => setDbPassword(e.target.value)} type="password" placeholder={dbConfigured ? '••••••••••••' : ''} />
            </div>
            <div className="row-actions">
              <div className={`status ${dbLastTested ? '' : 'pending'}`}>
                <span className="dot" />
                {dbStatus ?? (dbLastTested ? `Working — last checked ${formatDateTime(dbLastTested)}` : dbConfigured ? 'Saved — click Test connection' : 'Not connected yet')}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleSaveConnector} disabled={dbSaving || !dbHost || !dbDatabase || !dbUsername}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={handleTestConnector} disabled={!dbConfigured || dbTesting}>Test connection</button>
              <button className="btn btn-ghost btn-sm" onClick={handleDiscoverSchema} disabled={discovering}>
                {discovering ? 'Loading…' : 'Load my tables'}
              </button>
            </div>

            {schema && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--hairline-strong)', paddingTop: 14 }}>
                <div className="section-head">
                  <span className="step-num">3</span>
                  <h2>Choose what the AI may read</h2>
                </div>
                <p className="desc">
                  Tick the information the AI is allowed to see — for example order dates, delivery status and refunds.
                  It never sees anything you leave unticked, and it never writes to your database.
                  Leave out anything it doesn't need, like payment card details.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <a className="text-link" href="#select-all" style={{ fontSize: 12 }} onClick={(e) => { e.preventDefault(); toggleAllTables(true) }}>Select all</a>
                  <span style={{ color: 'var(--text-3)', margin: '0 6px' }}>·</span>
                  <a className="text-link" href="#select-none" style={{ fontSize: 12 }} onClick={(e) => { e.preventDefault(); toggleAllTables(false) }}>Select none</a>
                </div>
                {Object.entries(schema).map(([table, columns]) => (
                  <div key={table} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{table}</span>
                      <a className="text-link" href="#toggle-table" style={{ fontSize: 11.5 }} onClick={(e) => { e.preventDefault(); toggleAllInTable(table, columns) }}>
                        {columns.every((c) => selectedColumns[table]?.has(c)) ? 'Deselect all' : 'Select all'}
                      </a>
                    </div>
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
                  {savingAllowlist ? 'Saving…' : 'Save these choices'}
                </button>
              </div>
            )}

            {schema && (
              <div style={{ marginTop: 18, borderTop: '1px solid var(--hairline-strong)', paddingTop: 14 }}>
                <h2 style={{ fontSize: 13.5 }}>Which table holds what?</h2>
                <p className="desc" style={{ marginLeft: 0 }}>
                  Your database may name things differently from us. For each kind of record, pick the table that holds it
                  and the column with the order ID. Not sure? Click <strong>Suggest with AI</strong> and check the result.
                </p>
                <button className="btn btn-ghost btn-sm" onClick={handleSuggestMapping} disabled={suggestingMapping} style={{ marginBottom: 12 }}>
                  {suggestingMapping ? 'Asking AI…' : 'Suggest with AI'}
                </button>
                {ROLES.map((role) => (
                  <div className="row" key={role}>
                    <label htmlFor={`setup-role-${role}`}>{ROLE_LABEL[role]}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        id={`setup-role-${role}`}
                        aria-label={`${ROLE_LABEL[role]} table`}
                        value={roleMapping[role]?.tableName ?? ''}
                        onChange={(e) => updateRoleMapping(role, 'tableName', e.target.value)}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <option value="">— not in my database —</option>
                        {Object.keys(schema).map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        value={roleMapping[role]?.orderIdColumn ?? ''}
                        onChange={(e) => updateRoleMapping(role, 'orderIdColumn', e.target.value)}
                        disabled={!roleMapping[role]?.tableName}
                        aria-label={role === 'customers' ? 'Customers: column with the customer ID' : `${ROLE_LABEL[role]}: column with the order ID`}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <option value="">{role === 'customers' ? 'column with the customer ID' : 'column with the order ID'}</option>
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
                          aria-label="Column with the customer's name"
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
                          aria-label="Column with the customer's email"
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <option value="">customer email column (optional)</option>
                          {(schema[roleMapping[role]?.tableName ?? ''] ?? []).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <select
                          value={roleMapping[role]?.customerIdColumn ?? ''}
                          onChange={(e) => updateRoleMapping(role, 'customerIdColumn', e.target.value)}
                          aria-label="Column linking the order to your customers table"
                          title="Use this if customer names live in a separate customers table"
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <option value="">links to customers table (optional)</option>
                          {(schema[roleMapping[role]?.tableName ?? ''] ?? []).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {role === 'customers' && roleMapping[role]?.tableName && (() => {
                      const [first = '', last = ''] = (roleMapping[role]?.customerNameColumn ?? '').split(',')
                      const setName = (f: string, l: string) => updateRoleMapping(role, 'customerNameColumn', [f, l].filter(Boolean).join(','))
                      return (
                        <div style={{ gridColumn: '2 / -1', marginTop: 6 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <select value={first} onChange={(e) => setName(e.target.value, last)} aria-label="Customers: first name (or full name) column" style={{ flex: 1, minWidth: 0 }}>
                              <option value="">name column (or first name)</option>
                              {(schema[roleMapping[role]?.tableName ?? ''] ?? []).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                            </select>
                            <select value={last} onChange={(e) => setName(first, e.target.value)} aria-label="Customers: last name column" disabled={!first} style={{ flex: 1, minWidth: 0 }}>
                              <option value="">last name column (optional)</option>
                              {(schema[roleMapping[role]?.tableName ?? ''] ?? []).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                            </select>
                            <select
                              value={roleMapping[role]?.customerEmailColumn ?? ''}
                              onChange={(e) => updateRoleMapping(role, 'customerEmailColumn', e.target.value)}
                              aria-label="Customers: email column"
                              style={{ flex: 1, minWidth: 0 }}
                            >
                              <option value="">email column (optional)</option>
                              {(schema[roleMapping[role]?.tableName ?? ''] ?? []).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                            </select>
                          </div>
                          <p className="hint" style={{ margin: '6px 0 0' }}>
                            Only used to show who each case is about — never sent to the AI. Also tick this table's name and email
                            columns in the list above, and set "links to customers table" on the Orders row.
                          </p>
                        </div>
                      )
                    })()}
                    {role === 'refunds' && roleMapping[role]?.tableName && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, gridColumn: '2 / -1' }}>
                        <select
                          value={roleMapping[role]?.statusColumn ?? ''}
                          onChange={(e) => updateRoleMapping(role, 'statusColumn', e.target.value)}
                          aria-label="Column with the refund status"
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <option value="">refund status column (optional)</option>
                          {(schema[roleMapping[role]?.tableName ?? ''] ?? []).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input
                          value={roleMapping[role]?.issuedValue ?? ''}
                          onChange={(e) => updateRoleMapping(role, 'issuedValue', e.target.value)}
                          aria-label="Status value that means the refund was paid"
                          placeholder='value meaning "refund paid" (e.g. issued)'
                          style={{ flex: 1, minWidth: 0 }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <div className="row-actions">
                  <div className={`status ${mappingStatus ? '' : 'pending'}`}>
                    <span className="dot" />
                    {mappingStatus ?? 'AI suggestions are a starting point — check them before saving'}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveMapping} disabled={savingMapping}>
                    {savingMapping ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

        </>
      )}

      {tab === 'Password' && (
        <ChangePasswordSection />
      )}

      {tab === 'Backup' && (
        <BackupSection />
      )}
    </>
  )
}

function BackupSection() {
  const [restoring, setRestoring] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleRestoreFile(file: File | undefined) {
    if (!file) return
    if (!window.confirm(
      'Restore this backup? Every case, policy, and setting currently in the app will be replaced with what\'s in this file. This can\'t be undone.'
    )) return
    setRestoring(true)
    setStatus(null)
    try {
      await restoreBackup(file)
      setStatus({ ok: true, text: 'Restored. Close and reopen Proofly now for the restored settings to take full effect.' })
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="card section">
      <div className="section-head">
        <div className="section-icon">
          <Icon name="db" />
        </div>
        <h2>Back up and restore</h2>
      </div>
      <p className="desc">
        Everything Proofly knows — cases, policies, and setup — lives only on this computer. If this PC is lost,
        so is that data, unless you've downloaded a backup. Nothing from your store's own database is included.
      </p>

      <div className="row">
        <label>Download a backup</label>
        <a className="btn btn-outline" href="/api/v1/setup/backup" download>
          <Icon name="upload" />
          Download backup (.zip)
        </a>
      </div>

      <div className="row">
        <label htmlFor="restore-file">Restore from a backup</label>
        <input
          id="restore-file"
          type="file"
          accept=".zip"
          disabled={restoring}
          onChange={(e) => {
            handleRestoreFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {status && (
        <div className="row-actions">
          <div className="status" role={status.ok ? 'status' : 'alert'} style={status.ok ? undefined : { color: 'var(--error)' }}>
            <span className="dot" style={status.ok ? undefined : { background: 'var(--error)' }} />
            {status.text}
          </div>
        </div>
      )}
    </div>
  )
}

function ChangePasswordSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.FormEvent) {
    e.preventDefault()
    if (next.length < 8) return setStatus({ ok: false, text: 'New password must be at least 8 characters.' })
    if (next !== confirm) return setStatus({ ok: false, text: "The new passwords don't match." })
    setSaving(true)
    setStatus(null)
    try {
      await changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setStatus({ ok: true, text: 'Password changed.' })
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card section" onSubmit={handleChange}>
      <div className="section-head">
        <div className="section-icon">
          <Icon name="lock" />
        </div>
        <h2>Change password</h2>
      </div>
      <p className="desc">This is the password you use to sign in to Proofly on this computer.</p>
      <div className="row">
        <label htmlFor="pw-current">Current password</label>
        <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="row">
        <label htmlFor="pw-new">New password</label>
        <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="at least 8 characters" />
      </div>
      <div className="row">
        <label htmlFor="pw-confirm">Confirm new password</label>
        <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <div className="row-actions">
        {status && (
          <div className="status" role={status.ok ? 'status' : 'alert'} style={status.ok ? undefined : { color: 'var(--error)' }}>
            <span className="dot" style={status.ok ? undefined : { background: 'var(--error)' }} />
            {status.text}
          </div>
        )}
        <button type="submit" className="btn btn-ghost btn-sm" disabled={saving || !current || !next}>
          {saving ? 'Saving…' : 'Change password'}
        </button>
      </div>
    </form>
  )
}
