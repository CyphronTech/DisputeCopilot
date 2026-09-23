# REST API contract

## Conventions

- Base path: `/api/v1`
- Authentication: secure server-side session cookie.
- Content type: `application/json`, except multipart policy upload and PDF download.
- Errors: `application/problem+json` using RFC 9457 fields.
- Correlation: `X-Correlation-ID` accepted or generated on every request.
- Idempotency: `Idempotency-Key` required for case creation, retry, approval, and policy upload.
- Identifiers: lowercase UUID strings.
- Dates: ISO 8601 UTC timestamps; policy effective dates use ISO `YYYY-MM-DD` interpreted in the merchant's configured time zone (see [RAG and evaluation](rag-and-evaluation.md)).

Example problem response:

```json
{
  "type": "https://disputecopilot.local/problems/order-not-found",
  "title": "Order not found",
  "status": 404,
  "detail": "No order matched the supplied ID through the configured view.",
  "instance": "/api/v1/cases/8b82cf10-ea15-4ec9-93a4-02c174ea11b4",
  "correlationId": "4ee1..."
}
```

## Session and users

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/session` | Public | Sign in and establish session |
| `DELETE` | `/session` | Signed in | Sign out |
| `GET` | `/session` | Signed in | Current user and roles |
| `GET` | `/users` | Admin | List users |
| `POST` | `/users` | Admin | Create user |
| `PATCH` | `/users/{userId}` | Admin | Change role or active status |

## Setup and integrations

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/setup/status` | Admin | Read masked configuration status |
| `GET` | `/setup/general` | Admin | Read merchant time zone and locale settings |
| `PUT` | `/setup/general` | Admin | Set the merchant IANA time zone used for policy effective-date calculations |
| `PUT` | `/setup/model` | Admin | Save provider, base URL, model names, and secret |
| `POST` | `/setup/model/test` | Admin | Run a non-customer-data connectivity test |
| `PUT` | `/setup/connector` | Admin | Save encrypted read-only DB configuration |
| `POST` | `/setup/connector/test` | Admin | Validate privileges, schema, and view contract |

Secrets are accepted write-only. Read responses contain only provider name, masked key suffix, last test time, and status. `/setup/general` is not a secret endpoint; it stores an IANA time zone identifier (for example `Asia/Kolkata`) used only for date arithmetic, never sent to the model provider as part of any prompt beyond a resolved calendar date.

Environment-variable secret override (an optional, opt-in operator profile) is documented in [Security and privacy](security-and-privacy.md); it does not add or change any API surface.

## Policy library

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/policies` | Signed in | List documents and versions |
| `POST` | `/policies` | Admin | Upload PDF/TXT and metadata |
| `GET` | `/policies/{documentId}` | Signed in | Document metadata and ingestion status |
| `GET` | `/policies/{documentId}/file` | Admin | Download original |
| `POST` | `/policies/{documentId}/activate` | Admin | Make an indexed version eligible |
| `POST` | `/policies/{documentId}/retire` | Admin | Exclude from future retrieval |

Multipart upload fields:

```text
file
title
documentType
version
effectiveFrom
effectiveTo (optional)
applicableDisputeType = PRODUCT_NOT_RECEIVED
```

Overlap validation groups documents into a "version family" by `(documentType, applicableDisputeType)` — the `version` label is a human-readable string and does not itself define grouping (see [RAG and evaluation](rag-and-evaluation.md)).

## Cases

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/cases` | Signed in | Paginated case list |
| `POST` | `/cases` | Analyst/Admin | Create investigation from order ID |
| `GET` | `/cases/{caseId}` | Signed in | Case header, state, and progress |
| `GET` | `/cases/{caseId}/timeline` | Signed in | Sourced chronological facts |
| `GET` | `/cases/{caseId}/evidence` | Signed in | Evidence manifest and gaps |
| `GET` | `/cases/{caseId}/policy-context` | Signed in | Retrieved chunks and citations |
| `GET` | `/cases/{caseId}/review` | Signed in | Reviewer checks and recommendation |
| `GET` | `/cases/{caseId}/report` | Signed in | Current structured draft |
| `PATCH` | `/cases/{caseId}/report` | Analyst/Admin | Create an edited draft revision |
| `POST` | `/cases/{caseId}/approve` | Analyst/Admin | Approve exact draft revision |
| `POST` | `/cases/{caseId}/retry` | Analyst/Admin | Retry from safe failed checkpoint |
| `GET` | `/cases/{caseId}/report.pdf` | Signed in | Download approved PDF |
| `POST` | `/cases/{caseId}/redact` | Admin | Redact personal data fields in the case snapshot |

Create case request:

```json
{
  "orderId": "ORD-2026-1042",
  "disputeType": "PRODUCT_NOT_RECEIVED"
}
```

Accepted response:

```json
{
  "caseId": "8b82cf10-ea15-4ec9-93a4-02c174ea11b4",
  "orderId": "ORD-2026-1042",
  "state": "CREATED",
  "createdAt": "2026-08-09T08:25:32Z"
}
```

`Idempotency-Key` scopes retry-safety for a single request, not for the order as a whole: submitting the same key and payload again returns the original case. A different key against an order ID that already has a **non-terminal** case (any state before `APPROVED`, `EXPORTED`, or `FAILED`) also returns the existing case rather than starting a second concurrent investigation, to avoid duplicate model spend and a split audit trail for one order. Once a case reaches a terminal state, a new request opens a new investigation for that order ID.

Approval request:

```json
{
  "reportRevisionId": "45bfb1c1-3081-4a92-adb0-a94245965028",
  "reportSha256": "771b...",
  "confirmation": true
}
```

`reportSha256` is the hash of the canonical structured report, not the PDF (see [Architecture](architecture.md#report-approval-integrity)).

## Audit

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/audit-events` | Admin | Filtered, paginated audit log |
| `GET` | `/cases/{caseId}/audit-events` | Signed in | Case-specific audit history |

## Case states

```text
CREATED
FETCHING_DATA
COLLECTING_EVIDENCE
RETRIEVING_POLICY
REVIEWING_EVIDENCE
GENERATING_REPORT
AWAITING_HUMAN_APPROVAL
MANUAL_REVIEW_REQUIRED
APPROVED
EXPORTED
FAILED
```

## Versioning rule

Breaking request or response changes require `/api/v2`. Additive fields may be introduced in `/api/v1`; clients must ignore unknown response fields.
