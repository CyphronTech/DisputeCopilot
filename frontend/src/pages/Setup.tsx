import { useEffect, useState } from 'react'
import { getModelConfig, getSetupConfig, saveModelConfig, testModelConfig } from '../api/client'
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
  }, [])

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
              Read-only access to <span className="mono">dispute_case_view</span> only.
            </p>
            <div className="row">
              <label>Host</label>
              <input defaultValue={config.dbHost} />
            </div>
            <div className="row">
              <label>Database</label>
              <input defaultValue={config.dbDatabase} />
            </div>
            <div className="row">
              <label>Username</label>
              <input defaultValue={config.dbUsername} />
            </div>
            <div className="row">
              <label>Password</label>
              <input type="password" placeholder="••••••••••••" />
            </div>
            <div className="row-actions">
              <div className={`status ${config.dbLastTested ? '' : 'pending'}`}>
                <span className="dot" />
                {config.dbLastTested ?? 'Not yet tested'}
              </div>
              <button className="btn btn-ghost btn-sm">Test connection</button>
            </div>
          </div>

          <div className="card section">
            <div className="section-head">
              <div className="section-icon">
                <Icon name="clock" />
              </div>
              <h2>Merchant time zone</h2>
            </div>
            <p className="desc">Used to compute the calendar date for policy effective-date filtering.</p>
            <div className="row">
              <label>Time zone</label>
              <select defaultValue={config.timeZone}>
                <option>{config.timeZone}</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary">Save configuration</button>
        </>
      )}
    </>
  )
}
