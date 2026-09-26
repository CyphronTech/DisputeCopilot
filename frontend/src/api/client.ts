import type { AuditEvent, CaseDetail, CaseMetrics, CaseSummary, DraftReport, PolicyDocument, SaveModelConfigRequest } from './types'

export async function login(email: string, password: string): Promise<void> {
  const r = await fetch('/api/v1/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) throw new Error('Invalid email or password')
}

export async function logout(): Promise<void> {
  await fetch('/api/v1/session', { method: 'DELETE' })
}

export async function whoami(): Promise<{ email: string } | null> {
  const r = await fetch('/api/v1/session')
  if (!r.ok) return null
  return r.json()
}

export async function getCases(): Promise<CaseSummary[]> {
  return fetch('/api/v1/cases').then((r) => r.json())
}

export async function getCaseMetrics(): Promise<CaseMetrics> {
  const r = await fetch('/api/v1/cases/metrics')
  const m = await r.json()
  return { openCases: m.openCases, awaitingApproval: m.awaitingApproval, manualReview: m.manualReview, exportedWithoutEditsPct: m.exportedWithoutEditsPct }
}

export async function createCase(orderId: string): Promise<CaseDetail> {
  const r = await fetch('/api/v1/cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getCase(caseId: string): Promise<CaseDetail> {
  return fetch(`/api/v1/cases/${caseId}`).then((r) => r.json())
}

export async function resolveManually(caseId: string, recommendation: 'CONTEST' | 'ACCEPT', note: string): Promise<CaseDetail> {
  const r = await fetch(`/api/v1/cases/${caseId}/manual-resolution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recommendation, note }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getDraftReport(caseId: string): Promise<DraftReport> {
  return fetch(`/api/v1/cases/${caseId}/report`).then((r) => r.json())
}

export async function approveReport(caseId: string): Promise<DraftReport> {
  const r = await fetch(`/api/v1/cases/${caseId}/report/approve`, { method: 'POST' })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function requestReportChanges(caseId: string, note: string): Promise<DraftReport> {
  const r = await fetch(`/api/v1/cases/${caseId}/report/request-changes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getPolicies(): Promise<PolicyDocument[]> {
  return fetch('/api/v1/policies').then((r) => r.json())
}

export async function uploadPolicy(file: File): Promise<PolicyDocument> {
  const form = new FormData()
  form.append('file', file)
  const r = await fetch('/api/v1/policies', { method: 'POST', body: form })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getAuditEvents(): Promise<AuditEvent[]> {
  const r = await fetch('/api/v1/audit')
  const events = await r.json()
  return events.map((e: AuditEvent) => ({ ...e, timestamp: new Date(e.timestamp).toLocaleString() }))
}

export async function getModelConfig() {
  const r = await fetch('/api/v1/setup/model')
  const m = await r.json()
  return { provider: m.provider ?? '', baseUrl: m.baseUrl ?? '', maskedKey: m.maskedKey, model: m.model ?? '', lastTestedAt: m.lastTestedAt }
}

export async function saveModelConfig(req: SaveModelConfigRequest) {
  const r = await fetch('/api/v1/setup/model', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function testModelConfig(): Promise<{ ok: boolean; message: string }> {
  const r = await fetch('/api/v1/setup/model/test', { method: 'POST' })
  return r.json()
}

export interface ConnectorView {
  configured: boolean
  host: string | null
  port: number | null
  database: string | null
  username: string | null
  driver: string | null
  lastTestedAt: string | null
}

export async function getConnectorConfig(): Promise<ConnectorView> {
  const r = await fetch('/api/v1/setup/connector')
  return r.json()
}

export async function saveConnectorConfig(req: { host: string; port: number; database: string; username: string; password: string; driver: string }): Promise<ConnectorView> {
  const r = await fetch('/api/v1/setup/connector', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function testConnectorConfig(): Promise<{ ok: boolean; message: string }> {
  const r = await fetch('/api/v1/setup/connector/test', { method: 'POST' })
  return r.json()
}

export async function discoverSchema(): Promise<Record<string, string[]>> {
  const r = await fetch('/api/v1/setup/connector/schema')
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getAllowlist(): Promise<Record<string, string[]>> {
  const r = await fetch('/api/v1/setup/connector/allowlist')
  return r.json()
}

export async function saveAllowlist(allowlist: Record<string, string[]>): Promise<Record<string, string[]>> {
  const r = await fetch('/api/v1/setup/connector/allowlist', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allowlist }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export interface RoleMapping {
  tableName: string
  orderIdColumn: string
  customerNameColumn?: string | null
  customerEmailColumn?: string | null
  statusColumn?: string | null
  issuedValue?: string | null
}

export async function suggestTableMapping(): Promise<Record<string, RoleMapping>> {
  const r = await fetch('/api/v1/setup/connector/suggest-mapping')
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getTableRoleMapping(): Promise<Record<string, RoleMapping>> {
  const r = await fetch('/api/v1/setup/connector/role-mapping')
  return r.json()
}

export async function saveTableRoleMapping(mapping: Record<string, RoleMapping>): Promise<Record<string, RoleMapping>> {
  const r = await fetch('/api/v1/setup/connector/role-mapping', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapping),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export interface ShopifyView {
  configured: boolean
  shopDomain: string | null
  lastTestedAt: string | null
}

export async function getShopifyConfig(): Promise<ShopifyView> {
  const r = await fetch('/api/v1/setup/shopify')
  return r.json()
}

export async function saveShopifyConfig(req: { shopDomain: string; accessToken: string }): Promise<ShopifyView> {
  const r = await fetch('/api/v1/setup/shopify', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function testShopifyConfig(): Promise<{ ok: boolean; message: string }> {
  const r = await fetch('/api/v1/setup/shopify/test', { method: 'POST' })
  return r.json()
}

