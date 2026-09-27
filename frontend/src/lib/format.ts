import type { EvidenceItem } from '../api/types'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' })
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/**
 * Dates reach the UI in several shapes: ISO timestamps, database values like
 * "2026-06-13 10:50:05.0", and plain "2026-06-13". Anything we can't parse is shown as-is
 * rather than as "Invalid Date".
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  // A bare date is a calendar day, not midnight UTC — format it without shifting time zones.
  if (DATE_ONLY.test(value)) return dateFmt.format(new Date(value))
  const d = new Date(/^\d{4}-\d{2}-\d{2} /.test(value) ? value.replace(' ', 'T') : value)
  return Number.isNaN(d.getTime()) ? value : dateTimeFmt.format(d)
}

// The backend names evidence after the kind of record it read (its "role" in Setup).
const RECORD_LABEL: Record<string, { found: string; missing: string; plural: string }> = {
  orders: { found: 'Order details', missing: 'No order on record', plural: 'order' },
  payments: { found: 'Payment', missing: 'No payment on record', plural: 'payment' },
  fulfillment: { found: 'Shipping & delivery', missing: 'No shipping record', plural: 'shipping' },
  refunds: { found: 'Refund', missing: 'No refund on record', plural: 'refund' },
  returns: { found: 'Return', missing: 'No return on record', plural: 'return' },
  communications: { found: 'Customer message', missing: 'No customer messages on record', plural: 'customer message' },
}

function humanize(name: string): string {
  const s = name.replace(/[_.-]+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "gap · refunds" → "refunds"; null when the item isn't a gap. */
function gapRecord(sourceRef: string): string | null {
  return sourceRef.startsWith('gap · ') ? sourceRef.slice('gap · '.length) : null
}

export function evidenceTitle(item: Pick<EvidenceItem, 'kind' | 'title' | 'sourceRef'>): string {
  const gap = item.kind === 'gap' ? gapRecord(item.sourceRef) ?? item.title.replace(/ missing$/, '') : null
  if (gap !== null) return RECORD_LABEL[gap]?.missing ?? `No ${humanize(gap).toLowerCase()} on record`
  return RECORD_LABEL[item.title]?.found ?? humanize(item.title)
}

export function evidenceDescription(item: Pick<EvidenceItem, 'kind' | 'description'>): string {
  return item.kind === 'gap' ? "We checked your store's records and found nothing for this order." : item.description
}

/** "orders.currency" → "From your order records"; nothing for gaps. */
export function sourceLabel(sourceRef: string): string | null {
  if (!sourceRef || gapRecord(sourceRef) !== null) return null
  const table = sourceRef.split('.')[0]
  return `From your ${RECORD_LABEL[table]?.plural ?? humanize(table).toLowerCase()} records`
}

/** Report evidence lines are built as "<title>: <description>"; translate the title part. */
export function reportEvidenceLine(text: string, sourceRef: string): string {
  const gap = gapRecord(sourceRef)
  if (gap !== null) return evidenceTitle({ kind: 'gap', title: gap, sourceRef })
  const i = text.indexOf(': ')
  if (i < 0) return text
  const title = text.slice(0, i)
  return RECORD_LABEL[title] ? `${RECORD_LABEL[title].found}: ${text.slice(i + 2)}` : text
}
