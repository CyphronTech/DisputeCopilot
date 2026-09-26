// Mirrors docs/api-contract.md. Keep in sync with the backend response shapes.

export type CaseState =
  | 'CREATED'
  | 'FETCHING_DATA'
  | 'COLLECTING_EVIDENCE'
  | 'RETRIEVING_POLICY'
  | 'REVIEWING_EVIDENCE'
  | 'GENERATING_REPORT'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'APPROVED'
  | 'EXPORTED'
  | 'FAILED'

export type Recommendation = 'CONTEST' | 'ACCEPT' | 'MANUAL_REVIEW_REQUIRED'

export interface CaseSummary {
  caseId: string
  orderId: string
  customerName: string
  customerEmail: string
  state: CaseState
  recommendation?: Recommendation
  confidence?: number // 0..1
  summary?: string
  createdAt: string // ISO
}

export interface CaseMetrics {
  openCases: number
  awaitingApproval: number
  manualReview: number
  exportedWithoutEditsPct: number
}

export interface EvidenceItem {
  observedAt: string | null
  title: string
  description: string
  sourceRef: string
  kind: 'ok' | 'gap' | 'communication'
  attachmentUrl: string | null
}

export interface PolicyCitation {
  documentId: string
  title: string
  version: string
  page: number
  quote: string
}

export interface CaseDetail {
  caseId: string
  orderId: string
  customerName: string
  state: CaseState
  evidence: EvidenceItem[]
  citations: PolicyCitation[]
  recommendation?: Recommendation
  confidence?: number
  caveat?: string
  summary?: string
}

export interface DraftReport {
  caseId: string
  orderId: string
  revision: number
  approved: boolean
  caseSummary: string
  evidenceIndex: { text: string; sourceRef: string }[]
  policyCitationsSummary: string
  limitations: string
  recommendation: Recommendation
  confidence: number
  policyVersion: string
  model: string
  contentHash: string
}

export type PolicyStatus = 'ACTIVE' | 'RETIRED' | 'INDEXING' | 'DRAFT' | 'FAILED'

export interface PolicyVersion {
  version: string
  status: PolicyStatus
  effectiveFrom: string
  effectiveTo: string | null
}

export interface PolicyDocument {
  documentId: string
  title: string
  filename: string
  version: string
  status: PolicyStatus
  effectiveFrom: string
  effectiveTo: string | null
  versions: PolicyVersion[]
}

export interface AuditEvent {
  id: string
  title: string
  detail: string
  caseOrderId: string | null
  actorName: string
  actorInitials: string
  actorIsSystem: boolean
  icon: 'check' | 'alert' | 'db' | 'setup' | 'user'
  tone: 'accent' | 'warn' | 'success' | 'neutral'
  timestamp: string
}

export type ModelProvider = 'anthropic' | 'openai' | 'local'

export interface SaveModelConfigRequest {
  provider: ModelProvider
  baseUrl: string
  apiKey: string
  model: string
}
