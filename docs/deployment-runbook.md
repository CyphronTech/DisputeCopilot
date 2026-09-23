# Deployment and operations runbook

## Distribution model

DisputeCopilot is distributed as a release archive or source repository. It is installed once on a merchant-controlled machine and used through a browser. It is not a desktop `.exe`.

Planned release contents:

```text
disputecopilot/
├── compose.yaml
├── .env.example
├── install.sh
├── install.ps1
├── start.sh
├── start.ps1
├── stop.sh
├── backup.sh
├── restore.sh
└── README.md
```

The scripts are implementation-plan deliverables; they are not present in the design-only repository yet.

## Profiles

### Local demo

- Binds application to `127.0.0.1:8080`.
- Opens `http://localhost:8080`.
- Uses seeded merchant database fixtures when explicitly enabled.
- Suitable for portfolio demonstrations and local development.

### Merchant server

- Binds application on the merchant's private network.
- Uses a merchant-controlled TLS reverse proxy and internal DNS name.
- Connects to the real read-only `dispute_case_view`.
- Restricts outbound traffic to the merchant DB and configured model provider.

## Starting resource target

For evaluation and a small merchant workload, begin with:

- 2 CPU cores.
- 4 GB memory.
- 10 GB available disk plus retained evidence/report capacity.
- A supported container engine with Compose compatibility.

These are initial sizing targets and must be validated with load and document-ingestion tests.

## Persistent paths

| Volume | Contents | Backup requirement |
|---|---|---|
| `postgres-data` | Application records and pgvector embeddings | PostgreSQL-consistent dump |
| `document-data` | Original policies, evidence objects, PDFs | File archive with checksums |
| `secret-data` | Installation encryption key | Encrypted offline copy |

Losing `secret-data` while retaining encrypted configuration makes stored credentials unrecoverable. It must be included in protected backups.

## First-run sequence

1. Operator starts the Compose project.
2. Application migrates the database through Flyway.
3. If no administrator exists, a single-use setup token appears in the local console.
4. Administrator opens the private URL and creates the first account.
5. Administrator sets the merchant's IANA time zone (used for all policy effective-date calculations; see [RAG and evaluation](rag-and-evaluation.md)).
6. Administrator configures and tests model and embedding credentials.
7. Administrator configures and tests the read-only merchant DB connector.
8. Administrator uploads and activates at least one applicable policy.
9. Health page reports ready for investigations.

## Readiness conditions

The application is ready only when:

- PostgreSQL and required extensions are available.
- Migrations are current.
- Document and secret volumes are writable with safe permissions.
- An administrator exists.
- The merchant time zone is set.
- Connector and model configuration exist.
- At least one active product-not-received policy exists.

Model or merchant database outages after startup degrade investigation capability but should not prevent administrators from opening the UI and reading existing cases.

## Backup design

A backup operation must:

1. Prevent new approvals and policy ingestion.
2. Create a PostgreSQL custom-format dump.
3. Archive document and secret volumes.
4. Produce a manifest with schema version, application version, file count, sizes, and SHA-256 checksums.
5. Encrypt the resulting backup before it leaves the merchant machine.

## Restore verification

Restore into a clean deployment and verify:

- Flyway schema compatibility.
- User authentication.
- Policy document and chunk counts.
- File checksums.
- For each approved report: recompute the SHA-256 of the stored canonical structured report and confirm it matches the recorded approval hash, then confirm the PDF regenerates from that structured report without error. This is a structured-data hash comparison plus a regeneration check, not a byte-for-byte PDF comparison (see [Architecture — Report approval integrity](architecture.md#report-approval-integrity)).
- Ability to retrieve a known policy fixture.
- Connector and model secrets decrypt but remain masked.

## Upgrade design

1. Read release notes and back up.
2. Pull or load the pinned application and PostgreSQL images.
3. Stop the old application container, leaving volumes intact.
4. Start the new application and run forward-only migrations.
5. Run readiness and smoke tests.
6. Keep the prior image tag available for application rollback; database rollback requires restore if a migration is not backward compatible.

Images must use immutable version tags rather than `latest`.

## Monitoring

Minimum operational views:

- `/actuator/health/liveness`
- `/actuator/health/readiness`
- Application version and schema version.
- Pending/failed workflow job count.
- Connector and model last-test status.
- Disk usage for database and document volumes.
- Recent audit and error events, including cost-ceiling breaches.

## Incident examples

### Model provider unavailable

Keep completed stage outputs, transition the current job to retryable failure, show the provider error category without response payloads, and allow an administrator or analyst to retry later.

### Merchant DB unavailable

Do not fall back to stale data for a new case. Existing case snapshots remain viewable. Retry the connector step when access returns.

### Disk nearly full

Block new uploads and report generation before exhaustion. Keep case viewing and administrative cleanup available.

### Corrupt document

Quarantine the stored object, mark the policy version failed, exclude its chunks from retrieval, and alert an administrator.

### Case approaching its cost ceiling

Surface a warning in the case workspace once cumulative spend crosses a configurable fraction (for example 80%) of the per-case ceiling, before the workflow itself blocks further model calls at 100% (see [Architecture — Cost ceiling](architecture.md#cost-ceiling)).

## Deletion and retention

The MVP exposes explicit administrator deletion only for unapproved cases and retired policies not referenced by an approved report. Approved report dependencies remain immutable; for those, the MVP supports **redaction** of personal data fields rather than deletion, and full erasure remains deferred until legal and operational requirements are known (see [Security and privacy — Data subject rights and retention](security-and-privacy.md#data-subject-rights-and-retention)).
