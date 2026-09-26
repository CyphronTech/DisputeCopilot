// Placeholder data standing in for the backend. Delete once client.ts calls real endpoints.
import type {
  AuditEvent,
  CaseDetail,
  CaseMetrics,
  CaseSummary,
  DraftReport,
  PolicyDocument,
  SetupConfig,
} from './types'

export const mockCases: CaseSummary[] = [
  { caseId: 'c1', orderId: 'ORD-2026-1042', customerName: 'Priya Nair', customerEmail: 'priya.nair@mail.com', state: 'AWAITING_HUMAN_APPROVAL', recommendation: 'CONTEST', confidence: 0.88, createdAt: '2026-09-23T14:02:00Z' },
  { caseId: 'c2', orderId: 'ORD-2026-1039', customerName: 'Kabir Sethi', customerEmail: 'kabir.sethi@mail.com', state: 'MANUAL_REVIEW_REQUIRED', createdAt: '2026-09-23T11:47:00Z' },
  { caseId: 'c3', orderId: 'ORD-2026-1031', customerName: 'Meera Iyer', customerEmail: 'meera.iyer@mail.com', state: 'EXPORTED', recommendation: 'ACCEPT', confidence: 0.94, createdAt: '2026-09-22T17:10:00Z' },
  { caseId: 'c4', orderId: 'ORD-2026-1028', customerName: 'Arjun Verma', customerEmail: 'arjun.verma@mail.com', state: 'REVIEWING_EVIDENCE', createdAt: '2026-09-22T09:33:00Z' },
  { caseId: 'c5', orderId: 'ORD-2026-1019', customerName: 'Sana Sheikh', customerEmail: 'sana.sheikh@mail.com', state: 'FAILED', createdAt: '2026-09-21T20:55:00Z' },
]

export const mockMetrics: CaseMetrics = {
  openCases: 128,
  awaitingApproval: 6,
  manualReview: 3,
  exportedWithoutEditsPct: 91.4,
}

export const mockCaseDetail: CaseDetail = {
  caseId: 'c1',
  orderId: 'ORD-2026-1042',
  customerName: 'Priya Nair',
  state: 'AWAITING_HUMAN_APPROVAL',
  evidence: [
    { observedAt: 'Sep 18, 09:14', title: 'Order placed', description: '₹4,299 · Prepaid via UPI', sourceRef: 'order.createdAt', kind: 'ok' },
    { observedAt: 'Sep 19, 16:40', title: 'Shipment dispatched', description: 'Carrier: Bluedart · AWB 88123094', sourceRef: 'fulfillment.shippedAt', kind: 'ok' },
    { observedAt: 'Sep 21', title: 'Delivery proof missing', description: 'No POD scan found after last tracking event', sourceRef: 'gap · expectedEvidence', kind: 'gap' },
    { observedAt: 'Sep 22, 10:02', title: 'Customer message', description: '"Package never arrived, tracking stuck at Delhi hub"', sourceRef: 'communications[2]', kind: 'communication' },
  ],
  citations: [
    { documentId: 'd1', title: 'Shipping & Delivery Policy', version: '2026.2', page: 3, quote: 'Claims for non-delivery must be raised within 10 days of the last tracking update.' },
    { documentId: 'd2', title: 'Refund & Replacement Policy', version: '2026.1', page: 1, quote: 'Orders with no delivery confirmation after transit exceeds carrier SLA qualify for replacement.' },
  ],
  recommendation: 'CONTEST',
  confidence: 0.88,
  caveat: 'Delivery proof gap — recommendation issued despite missing POD scan',
}

export const mockDraftReport: DraftReport = {
  caseId: 'c1',
  orderId: 'ORD-2026-1042',
  revision: 3,
  approved: false,
  caseSummary: 'Order ORD-2026-1042 was placed on Sep 18 and dispatched via Bluedart on Sep 19. Tracking shows no delivery confirmation, and the customer reports non-receipt as of Sep 22.',
  evidenceIndex: [
    { text: 'Order and payment confirmed, prepaid via UPI', sourceRef: 'order.createdAt' },
    { text: 'Shipment dispatched with valid AWB', sourceRef: 'fulfillment.shippedAt' },
    { text: 'No proof-of-delivery scan on record', sourceRef: 'gap' },
    { text: 'Customer communication confirms non-receipt', sourceRef: 'communications[2]' },
  ],
  policyCitationsSummary: 'Shipping & Delivery Policy v2026.2, p.3 — claim window; Refund & Replacement Policy v2026.1, p.1 — replacement eligibility after SLA breach.',
  limitations: 'No proof-of-delivery scan was available at the time of review. The recommendation should be re-confirmed if a POD scan is later located.',
  recommendation: 'CONTEST',
  confidence: 0.88,
  policyVersion: '2026.2',
  model: 'gpt-4.1-mini',
  contentHash: '771ba4e9f0c25db3e1a90cd4f7...',
}

export const mockPolicies: PolicyDocument[] = [
  {
    documentId: 'p1', title: 'Shipping & Delivery Policy', filename: 'shipping-delivery-2026-2.pdf',
    version: '2026.2', status: 'ACTIVE', effectiveFrom: 'Jul 1', effectiveTo: null,
    versions: [
      { version: '2026.2', status: 'ACTIVE', effectiveFrom: 'Jul 1', effectiveTo: null },
      { version: '2026.1', status: 'RETIRED', effectiveFrom: 'Jan 1', effectiveTo: 'Jun 30' },
      { version: '2025.3', status: 'RETIRED', effectiveFrom: 'Apr 1', effectiveTo: 'Dec 31' },
    ],
  },
  { documentId: 'p2', title: 'Refund & Replacement Policy', filename: 'refund-replacement-2026-1.pdf', version: '2026.1', status: 'ACTIVE', effectiveFrom: 'Jan 1', effectiveTo: null, versions: [] },
  { documentId: 'p3', title: 'Terms and Conditions', filename: 'terms-2025-4.pdf', version: '2025.4', status: 'RETIRED', effectiveFrom: 'Oct 1', effectiveTo: 'Jun 30', versions: [] },
  { documentId: 'p4', title: 'Product-Not-Received Guidelines', filename: 'pnr-guidelines-draft.pdf', version: '2026.1', status: 'INDEXING', effectiveFrom: 'Pending', effectiveTo: null, versions: [] },
]

export const mockAuditEvents: AuditEvent[] = [
  { id: 'a1', title: 'Report approved', detail: 'revision 3 · hash 771ba4e9…', caseOrderId: 'ORD-2026-1031', actorName: 'Aditi Rao', actorInitials: 'AR', actorIsSystem: false, icon: 'check', tone: 'success', timestamp: 'Sep 22, 17:10:04' },
  { id: 'a2', title: 'Routed to manual review', detail: 'no eligible policy for order date', caseOrderId: 'ORD-2026-1039', actorName: 'System', actorInitials: 'SY', actorIsSystem: true, icon: 'alert', tone: 'warn', timestamp: 'Sep 23, 11:47:52' },
  { id: 'a3', title: 'Merchant DB query executed', detail: 'template v3 · 1 row', caseOrderId: 'ORD-2026-1042', actorName: 'System', actorInitials: 'SY', actorIsSystem: true, icon: 'db', tone: 'accent', timestamp: 'Sep 23, 14:02:11' },
  { id: 'a4', title: 'Connector configuration updated', detail: 'secret rotated, not logged', caseOrderId: null, actorName: 'Marcus Kim', actorInitials: 'MK', actorIsSystem: false, icon: 'setup', tone: 'neutral', timestamp: 'Sep 21, 09:15:40' },
  { id: 'a5', title: 'Login succeeded', detail: 'session started', caseOrderId: null, actorName: 'Aditi Rao', actorInitials: 'AR', actorIsSystem: false, icon: 'user', tone: 'neutral', timestamp: 'Sep 21, 08:59:02' },
]

export const mockSetup: SetupConfig = {
  modelProvider: 'openai',
  modelBaseUrl: 'https://api.openai.com/v1',
  modelKeyMasked: '••••••••••••••••',
  modelName: 'gpt-4o-mini',
  modelLastTested: '2 minutes ago',
  dbHost: '10.20.4.18:5432',
  dbDatabase: 'northwind_prod',
  dbUsername: 'disputecopilot_ro',
  dbLastTested: null,
  timeZone: 'Asia/Kolkata (UTC+05:30)',
}
