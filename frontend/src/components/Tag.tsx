import type { ReactNode } from 'react'
import type { CaseState, Recommendation } from '../api/types'

const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  CONTEST: 'Contest this dispute',
  ACCEPT: 'Accept this dispute',
  MANUAL_REVIEW_REQUIRED: 'Needs your review',
}

export function recommendationLabel(recommendation: Recommendation): string {
  return RECOMMENDATION_LABEL[recommendation]
}

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

const STATE_LABEL: Record<CaseState, string> = {
  CREATED: 'Just started',
  FETCHING_DATA: 'Looking up order',
  COLLECTING_EVIDENCE: 'Gathering records',
  RETRIEVING_POLICY: 'Checking policy',
  REVIEWING_EVIDENCE: 'AI reviewing',
  GENERATING_REPORT: 'Preparing report',
  AWAITING_HUMAN_APPROVAL: 'Needs your approval',
  MANUAL_REVIEW_REQUIRED: 'Needs your review',
  APPROVED: 'Approved',
  EXPORTED: 'Sent',
  FAILED: 'Something went wrong',
}

export function StateTag({ state }: { state: CaseState }) {
  return <Tag tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Tag>
}

export function Tag({ tone, children }: { tone: 'accent' | 'warn' | 'success' | 'neutral'; children: ReactNode }) {
  return (
    <span className={`tag tag-${tone}`}>
      <span className="dot" />
      {children}
    </span>
  )
}
