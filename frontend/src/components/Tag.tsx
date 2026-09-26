import type { ReactNode } from 'react'
import type { CaseState } from '../api/types'

const STATE_TONE: Record<CaseState, 'accent' | 'warn' | 'success' | 'neutral'> = {
  CREATED: 'accent',
  FETCHING_DATA: 'accent',
  COLLECTING_EVIDENCE: 'accent',
  RETRIEVING_POLICY: 'accent',
  REVIEWING_EVIDENCE: 'accent',
  GENERATING_REPORT: 'accent',
  AWAITING_HUMAN_APPROVAL: 'accent',
  MANUAL_REVIEW_REQUIRED: 'warn',
  APPROVED: 'success',
  EXPORTED: 'success',
  FAILED: 'neutral',
}

export function StateTag({ state }: { state: CaseState }) {
  return <Tag tone={STATE_TONE[state]}>{state}</Tag>
}

export function Tag({ tone, children }: { tone: 'accent' | 'warn' | 'success' | 'neutral'; children: ReactNode }) {
  return (
    <span className={`tag tag-${tone}`}>
      <span className="dot" />
      {children}
    </span>
  )
}
