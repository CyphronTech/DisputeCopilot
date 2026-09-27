import type { AuditEvent, CaseDetail, CaseMetrics, CaseSummary, DraftReport, PolicyDocument, SaveModelConfigRequest } from './types'

/**
 * Every call goes through here so a failure surfaces as a readable message instead of a
 * JSON parse error on an error body. Sessions expire after 12h idle; without the 401 branch
 * the app would sit on a broken page making calls that can never succeed.
 */
async function request(path: string, init?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch {
    throw new Error('Could not reach DisputeCopilot — check that the app is still running.')
  }
  if (response.status === 401) {
    if (!window.location.pathname.startsWith('/login')) window.location.assign('/login')
    throw new Error('Your session has expired. Please sign in again.')
  }
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed (${response.status})`)
  }
  return response
}

async function getJson<T>(path: string): Promise<T> {
  return (await request(path)).json() as Promise<T>
}

async function sendJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await request(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return response.json() as Promise<T>
}

export async function login(email: string, password: string): Promise<void> {
  // Deliberately not via request(): a 401 here means wrong credentials, not an expired session.
  const r = await fetch('/api/v1/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).catch(() => null)
  if (!r) throw new Error('Could not reach DisputeCopilot — check that the app is still running.')
  if (!r.ok) throw new Error('Invalid email or password')
}

/** Public: false on a fresh install, before the owner has created their login. */
export async function getAuthStatus(): Promise<{ passwordSet: boolean }> {
  return getJson<{ passwordSet: boolean }>('/api/v1/session/status')
}

/** First run only: creates the one admin login and signs in with it. */
export async function createAdminAccount(email: string, password: string): Promise<void> {
  await sendJson('/api/v1/session/setup', 'POST', { email, password })
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request('/api/v1/session/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function logout(): Promise<void> {
  await fetch('/api/v1/session', { method: 'DELETE' }).catch(() => null)
}

/** The auth probe itself — any failure just means "not signed in", never a redirect loop. */
export async function whoami(): Promise<{ email: string } | null> {
  try {
    const r = await fetch('/api/v1/session')
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}

export async function getCases(): Promise<CaseSummary[]> {
  return getJson<CaseSummary[]>('/api/v1/cases')
}

export async function getCaseMetrics(): Promise<CaseMetrics> {
  const m = await getJson<CaseMetrics>('/api/v1/cases/metrics')
  return { openCases: m.openCases, awaitingApproval: m.awaitingApproval, manualReview: m.manualReview, reportsDownloaded: m.reportsDownloaded }
}

export async function createCase(orderId: string): Promise<CaseDetail> {
  return sendJson<CaseDetail>('/api/v1/cases', 'POST', { orderId })
}

export async function getCase(caseId: string): Promise<CaseDetail> {
  return getJson<CaseDetail>(`/api/v1/cases/${caseId}`)
}

export async function resolveManually(caseId: string, recommendation: 'CONTEST' | 'ACCEPT', note: string): Promise<CaseDetail> {
  return sendJson<CaseDetail>(`/api/v1/cases/${caseId}/manual-resolution`, 'POST', { recommendation, note })
}

export async function getDraftReport(caseId: string): Promise<DraftReport> {
  return getJson<DraftReport>(`/api/v1/cases/${caseId}/report`)
}

export async function approveReport(caseId: string): Promise<DraftReport> {
  return sendJson<DraftReport>(`/api/v1/cases/${caseId}/report/approve`, 'POST')
}

export async function exportReport(caseId: string): Promise<DraftReport> {
  return sendJson<DraftReport>(`/api/v1/cases/${caseId}/report/export`, 'POST')
}

export async function requestReportChanges(caseId: string, note: string): Promise<DraftReport> {
  return sendJson<DraftReport>(`/api/v1/cases/${caseId}/report/request-changes`, 'POST', { note })
}

export async function getPolicies(): Promise<PolicyDocument[]> {
  return getJson<PolicyDocument[]>('/api/v1/policies')
}

export async function uploadPolicy(file: File): Promise<PolicyDocument> {
  const form = new FormData()
  form.append('file', file)
  const r = await request('/api/v1/policies', { method: 'POST', body: form })
  return r.json()
}

export async function deletePolicy(documentId: string): Promise<void> {
  await request(`/api/v1/policies/${documentId}`, { method: 'DELETE' })
}

export async function getAuditEvents(): Promise<AuditEvent[]> {
  const events = await getJson<AuditEvent[]>('/api/v1/audit')
  // Raw ISO: pages format it with formatDateTime; pre-formatting here made them re-parse a locale string.
  return events
}

export async function getModelConfig() {
  const m = await getJson<{ provider?: string; baseUrl?: string; maskedKey?: string; model?: string; lastTestedAt?: string }>('/api/v1/setup/model')
  return { provider: m.provider ?? '', baseUrl: m.baseUrl ?? '', maskedKey: m.maskedKey, model: m.model ?? '', lastTestedAt: m.lastTestedAt }
}

export async function saveModelConfig(req: SaveModelConfigRequest) {
  return sendJson<{ provider: string; baseUrl: string; maskedKey: string | null; model: string; lastTestedAt: string | null }>(
    '/api/v1/setup/model', 'PUT', req)
}

export async function testModelConfig(): Promise<{ ok: boolean; message: string }> {
  return sendJson<{ ok: boolean; message: string }>('/api/v1/setup/model/test', 'POST')
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
  return getJson<ConnectorView>('/api/v1/setup/connector')
}

export async function saveConnectorConfig(req: { host: string; port: number; database: string; username: string; password: string; driver: string }): Promise<ConnectorView> {
  return sendJson<ConnectorView>('/api/v1/setup/connector', 'PUT', req)
}

export async function testConnectorConfig(): Promise<{ ok: boolean; message: string }> {
  return sendJson<{ ok: boolean; message: string }>('/api/v1/setup/connector/test', 'POST')
}

export async function discoverSchema(): Promise<Record<string, string[]>> {
  return getJson<Record<string, string[]>>('/api/v1/setup/connector/schema')
}

export async function getAllowlist(): Promise<Record<string, string[]>> {
  return getJson<Record<string, string[]>>('/api/v1/setup/connector/allowlist')
}

export async function saveAllowlist(allowlist: Record<string, string[]>): Promise<Record<string, string[]>> {
  return sendJson<Record<string, string[]>>('/api/v1/setup/connector/allowlist', 'PUT', { allowlist })
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
  return getJson<Record<string, RoleMapping>>('/api/v1/setup/connector/suggest-mapping')
}

export async function getTableRoleMapping(): Promise<Record<string, RoleMapping>> {
  return getJson<Record<string, RoleMapping>>('/api/v1/setup/connector/role-mapping')
}

export async function saveTableRoleMapping(mapping: Record<string, RoleMapping>): Promise<Record<string, RoleMapping>> {
  return sendJson<Record<string, RoleMapping>>('/api/v1/setup/connector/role-mapping', 'PUT', mapping)
}

export interface ShopifyView {
  configured: boolean
  shopDomain: string | null
  lastTestedAt: string | null
}

export async function getShopifyConfig(): Promise<ShopifyView> {
  return getJson<ShopifyView>('/api/v1/setup/shopify')
}

export async function saveShopifyConfig(req: { shopDomain: string; accessToken: string }): Promise<ShopifyView> {
  return sendJson<ShopifyView>('/api/v1/setup/shopify', 'PUT', req)
}

export async function testShopifyConfig(): Promise<{ ok: boolean; message: string }> {
  return sendJson<{ ok: boolean; message: string }>('/api/v1/setup/shopify/test', 'POST')
}

