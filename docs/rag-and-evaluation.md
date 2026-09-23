# RAG ingestion, retrieval, and evaluation

## Purpose

RAG supplies the Evidence Reviewer with the merchant policy that applied when the order was placed. It is not a general chatbot and does not give every agent unrestricted access to all uploaded text.

## Document model

Required metadata:

| Field | Rule |
|---|---|
| Title | Merchant-readable name |
| Type | Terms, shipping, refund, or dispute guideline |
| Version | Immutable merchant-defined version label |
| Effective from | Required date |
| Effective to | Optional inclusive date |
| Dispute type | `PRODUCT_NOT_RECEIVED` for MVP |
| Status | Draft, indexing, active, failed, or retired |
| SHA-256 | Used for integrity and duplicate detection |

### Version families and overlap validation

A **version family** is the set of documents sharing the same `(documentType, applicableDisputeType)` pair. The `version` field is a human-readable label only — it does not define grouping and is not compared for overlap purposes. The application rejects a new upload whose `[effectiveFrom, effectiveTo]` range overlaps an existing **active** document in the same version family, unless the administrator explicitly retires the conflicting version first. Two documents of different `documentType` (for example, a shipping policy and a refund policy) are never compared against each other for overlap, even if their dates coincide.

## Ingestion pipeline

```text
Upload
  → MIME/signature/size validation
  → SHA-256 duplicate check
  → immutable local file write
  → page-aware extraction
  → normalization
  → semantic chunking
  → embedding cache lookup
  → embedding API for new chunks
  → pgvector write
  → activation readiness checks
```

### Extraction

- Apache PDFBox extracts text one PDF page at a time.
- Plain UTF-8 text is accepted directly.
- Apache Tika may detect MIME type but does not define page citations.
- Empty, scanned, encrypted, or malformed PDFs fail ingestion with an actionable error.

### Chunking baseline

- Prefer paragraph and heading boundaries.
- Target approximately 600 tokens per chunk.
- Allow approximately 80 tokens of overlap.
- Never cross a PDF page boundary; citations must identify one page.
- Store normalized text and its content hash.

Chunk size and overlap are configuration values to be tuned through evaluation, not hidden prompt constants.

### Embedding cache

The cache key is:

```text
sha256(normalizedChunk + embeddingProvider + embeddingModel)
```

Re-uploading identical content with the same embedding model reuses its vector. Changing embedding dimensions or model requires a new index generation; active cases retain their recorded generation.

## Retrieval pipeline

```text
orderDate + disputeType + evidence gaps
  → deterministic metadata filter
  → focused retrieval query
  → vector similarity top-K
  → threshold and duplicate removal
  → citation validation
  → RetrievedPolicyContext
```

### Order date computation

`orderDate` for the effective-date filter is **not** a naive UTC truncation of the order's creation timestamp. It is computed as:

```text
orderDate = toLocalDate(order.createdAt, merchant.timeZone)
```

where `merchant.timeZone` is an IANA time zone identifier (for example `Asia/Kolkata`) set by the administrator during first-run setup and stored in `installation_config` (see [Architecture](architecture.md) and [Deployment runbook](deployment-runbook.md)). This matters at policy effective-date boundaries: an order created late at night UTC can fall on a different calendar day in the merchant's own time zone, which can select a different policy version. The golden evaluation dataset's boundary fixtures are defined against this merchant-time-zone date, not the raw UTC timestamp.

Mandatory metadata filter:

```text
status == ACTIVE
AND disputeType == PRODUCT_NOT_RECEIVED
AND effectiveFrom <= orderDate
AND (effectiveTo IS NULL OR effectiveTo >= orderDate)
```

Initial retrieval configuration:

- `topK = 6`
- Similarity threshold is configuration selected from the golden dataset.
- No model-based reranker in the MVP.
- Retrieved chunks are ordered by relevance but retain page order inside a document when adjacent chunks are joined.

If no eligible chunk meets the evaluated threshold, retrieval returns an explicit empty result. The workflow transitions to manual review; the model is not asked to answer from general knowledge.

## Grounding contract

Every policy claim contains one or more citations:

```json
{
  "documentId": "ab7fbfbc-6f99-44cc-a15a-2f41d04fdf3d",
  "title": "Shipping and Delivery Policy",
  "version": "2026.2",
  "page": 3,
  "chunkId": "a88aeb47-6505-4e6f-b21f-7073a8b3e2a3",
  "quote": "Short supporting excerpt",
  "retrievalScore": 0.78
}
```

The quote is limited to the minimum supporting excerpt. The validator confirms that it exists in the stored chunk before accepting model output. Evidence facts (as opposed to policy claims) are grounded by a separate value-equality check described in [Architecture — Grounding validation](architecture.md#grounding-validation).

## Golden evaluation dataset

Create a versioned fixture set containing at least:

- Multiple policy versions with non-overlapping dates.
- Similar language across old and new policies.
- Orders exactly on effective-date boundaries, including at least one boundary case where the UTC calendar date and the merchant-time-zone calendar date differ (see Order date computation above).
- A missing-policy case.
- An irrelevant policy case.
- Conflicting evidence cases.
- Paraphrased queries.
- Prompt injection text inside a policy and a customer message.
- Documents with relevant language near chunk boundaries.
- At least one case where a fact's `sourceRef` is valid but its `value` has been deliberately altered from the source record, to exercise the evidence-value-equality validator.

Each fixture declares expected eligible documents, expected source pages, allowed recommendation set, required abstention behavior, and forbidden unsupported claims.

The dataset must contain at least 40 cases in total, with at least 3 examples per required scenario category listed above, before the thresholds below are treated as statistically meaningful release gates. Smaller ad hoc runs are useful during development but do not satisfy the MVP gate.

## Evaluation metrics and release thresholds

| Metric | Definition | MVP gate |
|---|---|---|
| Date-filter accuracy | Cases using only eligible policy versions, evaluated using the merchant-time-zone order date | 100% |
| Recall@6 | Golden relevant pages present in retrieved top six | At least 90% |
| Citation validity | Citations resolve and excerpts match stored chunks | 100% |
| Abstention accuracy | Missing-policy fixtures route to manual review | 100% |
| Source attribution | Evidence facts resolve to current case sources and match source values exactly for structured fields | 100% |
| Grounded recommendation | Human-graded recommendation supported by facts and policy | At least 90% |
| Prompt-injection resistance | Adversarial fixtures cause no instruction/tool-policy violation | 100% |

Thresholds are release criteria for the curated test set (minimum size above), not claims about arbitrary production data.

## Evaluation execution

Each run records:

- Dataset version.
- Application commit.
- Chat and embedding provider/model.
- Prompt and schema versions.
- Retrieval configuration.
- Temperature and other relevant model settings.
- Metric results and individual failures.
- Estimated token usage.

Evaluation must support a deterministic mock-provider mode for CI and an explicitly triggered live-provider profile for model quality checks.

## Cost controls

- Embed policy chunks once and reuse them.
- Skip duplicate chunk hashes.
- Retrieve only the top relevant chunks.
- Do not send original files to the chat model.
- Use typed, concise prompts and cap response size.
- Persist successful stage outputs so retries restart from the failed stage.
- Enforce the per-case cumulative cost ceiling described in [Architecture — Cost ceiling](architecture.md#cost-ceiling) before every model call, including repair attempts.
- Display per-case token usage without exposing content.
