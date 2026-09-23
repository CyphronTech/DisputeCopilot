# DisputeCopilot

A self-hosted, browser-based application that helps a D2C merchant assemble a
policy-grounded evidence packet for a "product not received" chargeback
dispute, without sending order data to a third-party SaaS product. See
[docs/project-context-handoff.md](docs/project-context-handoff.md) for full
context.

## Status

Design and implementation planning complete; application code has not started.
The next step is Plan 1 (case intake vertical slice) — see
[docs/superpowers/plans/2026-08-11-case-intake-vertical-slice.md](docs/superpowers/plans/2026-08-11-case-intake-vertical-slice.md).

## Documents

- [Project context and handoff](docs/project-context-handoff.md) — start here
- [Product requirements](docs/product-requirements.md)
- [Architecture and detailed design](docs/architecture.md)
- [REST API contract](docs/api-contract.md)
- [Security and privacy](docs/security-and-privacy.md)
- [RAG and evaluation](docs/rag-and-evaluation.md)
- [Deployment runbook](docs/deployment-runbook.md)
- [Approved design specification](docs/superpowers/specs/2026-08-09-disputecopilot-design.md)
- [Plan 1: case-intake vertical slice](docs/superpowers/plans/2026-08-11-case-intake-vertical-slice.md)

An interactive UI mockup is referenced in the design docs
(`mockups/disputecopilot-prototype.html`) but was not part of the archive this
repository was built from, so it is not present here yet.

## Stack (planned)

Java 21, Spring Boot, Spring Security, Spring AI, PostgreSQL + pgvector,
Flyway, React + TypeScript + Vite, Docker Compose. Version pins need
revalidation before implementation (see the handoff doc, §11 and §25).
