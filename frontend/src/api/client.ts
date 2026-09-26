// Each function below is the one place to swap in a real fetch('/api/v1/...') call.
// Cases now call the real backend. Everything else still resolves mock data until
// its backend endpoint exists — swap the commented fetch() line in when it does.
import type { AuditEvent, CaseDetail, CaseMetrics, CaseSummary, DraftReport, PolicyDocument, SaveModelConfigRequest, SetupConfig } from './types'
import { mockSetup } from './mockData'

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

export async function getDraftReport(caseId: string): Promise<DraftReport> {
  return fetch(`/api/v1/cases/${caseId}/report`).then((r) => r.json())
}

export async function approveReport(caseId: string): Promise<DraftReport> {
  const r = await fetch(`/api/v1/cases/${caseId}/report/approve`, { method: 'POST' })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getPolicies(): Promise<PolicyDocument[]> {
  return fetch('/api/v1/policies').then((r) => r.json())
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

export async function getSetupConfig(): Promise<SetupConfig> {
  return mockSetup
}
