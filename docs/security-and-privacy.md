# Security and privacy design

## Security objective

Keep merchant data under merchant control, minimize the information sent to the selected model provider, prevent the LLM from gaining authority over databases or financial actions, and preserve an auditable human decision.

Self-hosting changes the data processor boundary; it does not remove the need for secure configuration, patching, backups, or careful model-provider selection.

## Data classification

| Class | Examples | Handling |
|---|---|---|
| Secret | Model API key, DB password, installation key | Encrypt, mask, never log or prompt |
| Restricted customer data | Name, address, communication, tracking proof | Case-scope, minimize, audit access |
| Business confidential | Policies, dispute strategy, reports | Local storage, role controls, citations |
| Operational metadata | State, latency, model version, error code | Structured logs without raw payloads |

## Threat model

### Compromised or over-privileged connector

**Risk:** The application reads unrelated merchant data or modifies production records.

**Controls:**

- Dedicated database identity with `SELECT` only.
- Access limited to tables and columns an administrator explicitly approved during the setup-time schema-discovery step (see [Architecture — Schema discovery and the bounded read tool](architecture.md#schema-discovery-and-the-bounded-read-tool)); nothing else is queryable regardless of what any caller requests.
- Every read is parameterized and code-constructed — never string-built from model output.
- Read-only transaction mode, query timeout, and row limit.
- Startup privilege inspection and connector test.
- Query audit containing table, columns, and row count for every call.

### LLM-generated SQL or tool escalation

**Risk:** Prompt output attempts arbitrary database access, or expands its own reach over time.

**Controls:**

- The agent is never given a SQL tool, a JDBC object, or any way to supply query text. Its only database-adjacent tool is `readApprovedTable(table, orderId)`, which accepts a table name and returns rows — it does not accept or execute SQL.
- That tool enforces the administrator-approved allowlist itself, in code, on every call; the model cannot request a table or column it has not been granted, and cannot change what is granted.
- Every table read is scoped to a single order ID; there is no tool call that returns more than one order's data.
- What changed from the original design: the model may now choose *which* approved table to read and *when*, across a merchant-specific schema. It was never given, and still is not given, the ability to decide *what is approved* or to read outside one case's scope. The allowlist is set once by a human at setup, not by the model at runtime.

### Prompt injection in policies or communications

**Risk:** Uploaded text instructs the model to ignore system rules, reveal secrets, or alter the workflow.

**Controls:**

- Retrieved content is delimited and explicitly labeled untrusted evidence.
- System prompts state that document text is data, never instructions.
- Secrets and operational tools are unavailable in the prompt context.
- Typed output validation rejects unauthorized commands or unexpected fields.
- Evaluation includes adversarial documents and customer messages.

### Fabricated or mismatched evidence values

**Risk:** The Evidence Collector attaches a plausible-looking `sourceRef` to a fact whose `value` does not actually match what that source record contains, so the fact looks grounded but is not.

**Controls:**

- For every fact whose `kind` maps to a structured `CaseBundle` field, the deterministic validator re-reads that field from the case snapshot and rejects the fact unless `value` matches it exactly (see [Architecture — Grounding validation](architecture.md#grounding-validation)).
- This is separate from, and in addition to, policy citation quote-validation; a valid source pointer is necessary but not sufficient.
- Narrative timeline text is exempt from exact-match but must still resolve its `sourceRef` to the current case.

### Cross-case data leakage

**Risk:** Evidence or citations from one order appear in another case.

**Controls:**

- All evidence, file, and audit reads require the current `case_id`.
- Source references are validated against the active case snapshot.
- Retrieval is limited to the merchant-wide policy library; case attachments never enter policy RAG.
- Generated report references must resolve to the current case or retrieved policy context.

### Policy version error

**Risk:** A current policy is applied to an order placed under an older version, or the wrong version is selected because the order date is computed in the wrong time zone.

**Controls:**

- Immutable policy versions.
- Required effective-from date.
- Optional effective-to date with overlap validation, scoped by `(documentType, applicableDisputeType)` (see [RAG and evaluation](rag-and-evaluation.md)).
- The order timestamp is converted to a calendar date using the merchant's configured IANA time zone, not UTC, before the deterministic date filter runs.
- Deterministic date filter before vector similarity search.
- Citation displays title, version, effective dates, and page.

### Malicious file upload

**Risk:** Path traversal, parser exploitation, active content, or storage exhaustion.

**Controls:**

- Allow only PDF and plain text MIME/signature combinations.
- Reject scanned/no-text PDFs and encrypted PDFs in the MVP.
- Configurable 10 MB file limit and page-count limit.
- Generate internal file IDs; never use original filenames as paths.
- Parse through maintained libraries with resource and time limits.
- Store checksum, size, MIME, uploader, and creation time.
- Do not execute embedded content, macros, links, or JavaScript.

Antivirus scanning is deferred because it adds another service. A production rollout should integrate the merchant's existing scanning gateway.

### Secret disclosure

**Risk:** Keys appear in logs, UI responses, errors, exports, or model requests.

**Controls:**

- Installation key stored in a permission-restricted local secret volume.
- Stored secrets encrypted with authenticated encryption.
- Write-only secret API fields and masked configuration views.
- Central redaction for HTTP, JDBC, Spring AI, and exception logs.
- Automated tests scan logs and model requests for seeded canary secrets.

**Environment-variable override caveat:** an operator may optionally inject model or connector secrets through environment variables instead of the encrypted-storage flow. This is disabled by default, must be explicitly enabled per deployment, and is documented as a deliberately weaker guarantee: environment variables are visible to anything with container-inspect or `/proc` access on the host, so they do not benefit from the application's authenticated-encryption-at-rest control. When enabled, the application still masks these values identically to stored secrets in the UI, logs, and audit trail, but the confidentiality of the value itself becomes the host/container platform's responsibility, not the application's. This mode is out of scope for the local-demo and default merchant-server profiles.

### Unauthorized approval

**Risk:** A report is exported without a valid human decision.

**Controls:**

- Role check on approval and export.
- Approval binds the report revision and content hash (the structured report, not the PDF — see [Architecture](architecture.md#report-approval-integrity)).
- Editing creates a new revision and invalidates approval.
- Approver identity, timestamp, policy version, prompt version, and model version enter the audit trail.

### Runaway or unbounded model cost

**Risk:** Repeated repair attempts, retries, or an unusually large case cause unbounded model spend on a merchant's BYOK credentials.

**Controls:**

- A configurable per-case cumulative token/cost ceiling is enforced by the workflow before each model call, independent of retry/backoff limits (see [Architecture](architecture.md#cost-ceiling)).
- Exceeding the ceiling stops further model calls for that case, transitions it to `MANUAL_REVIEW_REQUIRED`, and writes an audit event rather than continuing to spend silently.

## Authentication and session design

- Spring Security form/session authentication.
- Password hashing using an adaptive Spring Security-supported encoder.
- Secure, HTTP-only, same-site cookies.
- CSRF protection for every mutation.
- Session expiration and explicit logout.
- First administrator created through a single-use setup token printed to the local console.
- Account lockout/rate limiting for repeated login failures.

SSO is outside the MVP but the authorization model should not depend on local-password specifics.

## Network design

### Local demo

- Bind HTTP only to `127.0.0.1`.
- PostgreSQL is reachable only on the Compose network.

### Shared merchant server

- HTTPS terminates at a merchant-controlled reverse proxy.
- PostgreSQL remains private to the application network.
- Outbound access is limited to the configured model provider and merchant database.
- Connector traffic uses TLS when the merchant database supports it.

## Model data minimization

Before each model call, the application constructs and audits a data manifest containing field categories, not raw values. Only the facts required by that agent stage are sent. Raw policy files, full databases, authentication data, and unrelated communications are never sent.

The setup UI must warn that selected case data and policy excerpts leave the merchant environment for the configured model provider. Merchant administrators remain responsible for provider terms, retention settings, and regional requirements.

## Data subject rights and retention

The merchant's own operational database remains the system of record for its customers, and remains the correct place to route a data-subject erasure or correction request under applicable law (including India's Digital Personal Data Protection Act, 2023, given the target market). DisputeCopilot additionally holds its own local copies of case-scoped personal data (case snapshots, evidence, generated reports), which must be independently addressable:

- **Unapproved cases and retired, unreferenced policies:** an administrator can hard-delete these today (see [Deployment runbook](deployment-runbook.md#deletion-and-retention)).
- **Cases tied to an approved report:** the approval hash binds to the report content, so hard-deleting the underlying personal data would break an existing audit/compliance record. Instead, an administrator can trigger **redaction**: personal data fields (customer name, address, contact details, and free-text communication bodies) in the stored case snapshot and evidence are replaced with a redaction marker, while the case ID, workflow history, policy citations, and the previously computed report hash are preserved unchanged. Redaction is logged as an audit event capturing actor, timestamp, and case ID.
- **Full deletion of an approved case's personal data** (as opposed to redaction) is deferred pending legal review, since it is not yet defined how to preserve a verifiable audit trail once the underlying evidence is gone. This is a known MVP limitation, not an oversight — see [Product requirements](product-requirements.md).

## Audit events

Audit events are append-only application records for:

- Login success/failure and user changes.
- Secret or connector configuration changes without secret values.
- Schema-discovery allowlist changes (tables/columns approved or revoked, and by whom).
- Merchant time zone configuration changes.
- Policy upload, activation, and retirement.
- Merchant DB query execution.
- Workflow transition, retry, failure, cost-ceiling breach, and manual review.
- Model/provider/prompt identifiers and token usage.
- Report edit, approval, export, and checksum.
- Case redaction.

## Security verification gates

Before an MVP release:

1. Verify the connector identity cannot insert, update, delete, or select outside the administrator-approved table/column allowlist, and that `readApprovedTable` rejects a table/column not on it even when called directly in a test.
2. Run authorization tests for every endpoint and role.
3. Run seeded-secret leakage tests across logs, responses, prompts, and PDFs, including the environment-variable override path if enabled.
4. Run path traversal and malformed document tests.
5. Run prompt-injection evaluation documents.
6. Run evidence-value-mismatch tests: seed a `CaseBundle` field that differs from what a mock model returns as a fact value, and confirm the validator rejects it.
7. Force a case past its cost ceiling in a test and confirm it stops calling the model and transitions to manual review.
8. Restore a backup into a clean deployment and validate report checksums.
