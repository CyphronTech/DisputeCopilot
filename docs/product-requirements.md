# Product requirements

## Product statement

Proofly helps a D2C merchant turn a product-not-received dispute into a structured, policy-grounded evidence packet without copying order data into a third-party SaaS product.

The merchant deploys the application in its own environment and provides its own model API credentials. Employees use a browser-based interface; an administrator installs and configures the application once.

## Problem

Chargeback and delivery disputes require analysts to assemble facts from order, payment, delivery, refund, and communication records. The work is repetitive, slow, and difficult to audit. Policies change over time, so using the current Terms and Conditions for an older order can produce the wrong recommendation.

## Personas

### Merchant administrator

- Installs or owns the deployment.
- Creates users and assigns roles.
- Configures the model provider and read-only merchant database connector.
- Runs the schema-discovery wizard and approves which tables and columns the connector may read.
- Sets the merchant's operating time zone used for policy effective-date calculations.
- Uploads, versions, activates, and retires policy documents.
- Reviews health and audit information.

### Dispute analyst

- Creates an investigation using an order ID.
- Reviews the evidence timeline and missing items.
- Inspects the retrieved policy sections and citations.
- Edits the drafted response.
- Approves and exports the final PDF packet.

## MVP user journey

1. An administrator completes local setup, sets the merchant time zone, and tests the merchant database connection.
2. The administrator runs the schema-discovery wizard, which lists the merchant's tables and columns and pre-ticks the ones it recognizes as order/payment/fulfillment/refund/communication data; the administrator confirms or adjusts the selection once.
3. The administrator uploads text-based PDF or TXT policies with version and effective dates.
4. An analyst enters an order ID for a product-not-received dispute.
5. The Evidence Collector calls the bounded read tool per approved table to assemble a case-scoped data bundle, then produces a sourced evidence manifest and timeline.
6. The policy retriever selects policy chunks active on the order date, computed in the merchant's configured time zone.
7. The Evidence Reviewer identifies supported facts, contradictions, gaps, and a neutral recommendation.
8. The Report Generator drafts a cited response and evidence index.
9. The analyst edits, approves, and exports the PDF packet.

## MVP functional scope

### Included

- Local first-run setup and authentication.
- `MERCHANT_ADMIN` and `DISPUTE_ANALYST` roles.
- One merchant per deployment.
- One dispute type: product not received.
- One read-only relational database connector profile per deployment, connecting to a PostgreSQL merchant source database.
- A setup-time schema-discovery wizard that lists the merchant's tables and columns and lets an administrator approve which ones the connector may read, with unclear items defaulting to not approved (see [Architecture](architecture.md#schema-discovery-and-the-bounded-read-tool)).
- A bounded read tool, scoped to the approved tables/columns and always filtered to one order, that the Evidence Collector calls at runtime. The tool executes parameterized reads it builds itself; it never executes SQL text supplied by the model.
- A merchant-configured IANA time zone used to convert order timestamps into the calendar date used for policy effective-date filtering.
- Order lookup by exact order ID.
- Versioned PDF and TXT policy upload.
- RAG with effective-date and dispute-type filtering.
- Three typed agent stages with deterministic validation between stages, including a check that extracted evidence values match the source record they cite.
- A configurable per-case model-spend ceiling that forces manual review rather than unbounded retries or repair attempts.
- Case status, evidence timeline, policy citations, editable draft, approval, and PDF export.
- Audit events for configuration changes, data access, workflow transitions, agent versions, cost-ceiling breaches, and approval.
- Retry and manual-review paths.
- Administrator-triggered redaction of personal data fields in a case snapshot, available even for cases tied to an approved report (see [Security and privacy](security-and-privacy.md)).

### Excluded

- Automatic chargeback submission to a payment processor.
- Autonomous refunds, account suspension, or other financial actions.
- Fraud scoring or claims that a customer is lying.
- OCR for scanned documents.
- Email, chat, or ticketing integrations.
- Multiple merchants in one deployment.
- Mobile application.
- MySQL and other non-PostgreSQL merchant source databases. The connector is defined behind an interface so a MySQL adapter can be added later, but MVP scope, testing, and the security review cover PostgreSQL only.
- Kubernetes, Kafka, Redis, or a dedicated vector database.
- A hosted control plane operated by the project owner.
- Full data-subject erasure of case data tied to an approved report. The MVP supports redaction of personal fields (see [Security and privacy](security-and-privacy.md)); full deletion in that case is deferred pending legal review, since the approval hash depends on the report content existing.

## Acceptance criteria

1. An analyst can enter a valid order ID and receive a complete case view without manually uploading order data.
2. The connector never executes SQL text authored by the model. At runtime the model may only select which administrator-approved table to read for the current order; the application builds and parameterizes the actual query.
3. Every table and column the connector can read was explicitly approved by an administrator during setup; nothing not on that allowlist is queryable, regardless of what the model requests.
4. Every collected fact has a source reference and observation timestamp, and structured facts (order, payment, fulfillment, refund fields) match the source record's value exactly.
5. Every policy-dependent statement cites document title, version, page, and chunk ID.
6. Retrieval excludes policies that were not effective on the order date, where the order date is computed in the merchant's configured time zone, not UTC.
7. Missing applicable policy produces `MANUAL_REVIEW_REQUIRED` rather than a model-generated recommendation.
8. A generated report cannot be exported as approved until a human confirms it.
9. Restarting the application resumes non-terminal investigations from persisted workflow state.
10. Model and connector secrets never appear in API responses, application logs, or agent prompts.
11. A case whose per-case model-spend ceiling is exceeded stops calling the model and transitions to `MANUAL_REVIEW_REQUIRED` with an audit event, rather than retrying indefinitely.
12. The reference RAG evaluation meets the thresholds defined in [RAG and evaluation](rag-and-evaluation.md).

## Product success measures

The MVP should demonstrate:

- Median analyst preparation time compared with a manual baseline.
- Percentage of reports exported without major factual correction.
- Evidence-gap detection rate on the golden test set.
- Policy retrieval recall and citation validity.
- Human override and edit rates.
- Successful workflow recovery after injected model and database failures.

These metrics are evaluation targets, not claims of achieved performance.
