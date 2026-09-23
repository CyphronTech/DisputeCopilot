# Case Intake Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working DisputeCopilot slice: a React user enters a product-not-received order ID, Spring Boot accepts the request idempotently, a durable worker reads one allowlisted merchant database view, and the persisted case snapshot appears in the browser.

**Architecture:** Use a React + TypeScript SPA during development and compile it into the Spring Boot image for the demo. Spring Boot exposes the `/api/v1/cases` contract, persists case/workflow state in PostgreSQL, and uses a second read-only JDBC datasource for the merchant fixture. This plan stops at `COLLECTING_EVIDENCE`; RAG and LLM agents begin in later plans.

**Tech Stack:** Java 21, Spring Boot 4.1.0, Maven, PostgreSQL 18 + pgvector 0.8.5, Flyway, Spring Data JPA, JDBC, Testcontainers, React 19.2.7, TypeScript, Vite 8.1, Vitest, Testing Library, Playwright, Docker Compose.

## Global Constraints

- Use Java 21 even though Spring Boot 4.1 supports newer Java versions.
- Use Spring Boot 4.1.0; do not add Spring AI until the agent/RAG plans.
- Use Node.js 24 LTS for frontend builds.
- Use React 19.2.7 and the supported Vite 8.1 release line.
- Use `pgvector/pgvector:0.8.5-pg18-bookworm` for the local application database.
- Keep the frontend and API same-origin in the packaged application; Vite proxies `/api` only during development.
- Bind the unauthenticated demo to host loopback only. Do not expose Plan 1 on a shared network.
- The LLM never receives database credentials or a SQL tool.
- Execute only the code-owned, parameterized `dispute_case_view` query.
- Store one immutable source snapshot for the exact order; never query or copy unrelated rows.
- Use UUID identifiers, UTC `Instant` values, and ISO 8601 JSON timestamps.
- Every database schema change uses Flyway; Hibernate schema generation remains disabled.
- Every task follows red-green-refactor, ends with its focused tests, and creates one commit.

## Version verification

Version pins were checked on 2026-08-11 against primary sources:

- [Spring Boot 4.1.0 system requirements](https://docs.spring.io/spring-boot/system-requirements.html)
- [Spring AI 2.0 compatibility](https://docs.spring.io/spring-ai/reference/getting-started.html) for the later RAG/agent plans
- [React 19.2 release line](https://react.dev/versions)
- [Vite supported release lines](https://vite.dev/releases)
- [Node.js 24 LTS status](https://nodejs.org/en/about/previous-releases)
- [pgvector PostgreSQL 18 image tags](https://hub.docker.com/r/pgvector/pgvector/tags?name=pg18)
- [PostgreSQL 18 releases](https://www.postgresql.org/docs/release/)
- [PostgreSQL 18 container volume-path change](https://hub.docker.com/_/postgres?tab=description)

## Implementation roadmap

This specification will be delivered through five plans rather than one oversized branch:

1. **Case intake vertical slice — this plan:** scaffold, durable case intake, read-only connector, React case view, Docker demo.
2. **Identity and secure setup:** local admin bootstrap, users/roles, sessions, encrypted BYOK and connector secrets.
3. **Policy library and RAG:** PDF/TXT ingestion, version/date rules, embeddings, pgvector retrieval, evaluation harness.
4. **Agent workflow and reports:** collector, reviewer, report generator, validators, human approval, PDF export.
5. **Operational hardening:** audit UI, backups, restore drills, failure injection, security checks, release packaging.

## File map

```text
.
├── compose.yaml
├── compose.demo.yaml
├── Dockerfile
├── .env.example
├── backend
│   ├── pom.xml
│   ├── mvnw
│   ├── mvnw.cmd
│   ├── .mvn/wrapper/*
│   └── src
│       ├── main
│       │   ├── java/com/disputecopilot
│       │   │   ├── DisputeCopilotApplication.java
│       │   │   ├── shared/api/ProblemDetailsAdvice.java
│       │   │   ├── shared/time/ClockConfiguration.java
│       │   │   ├── system/SystemInfoController.java
│       │   │   ├── casework/domain/*
│       │   │   ├── casework/api/*
│       │   │   ├── casework/persistence/*
│       │   │   ├── casework/service/*
│       │   │   ├── connector/*
│       │   │   └── workflow/*
│       │   └── resources
│       │       ├── application.yml
│       │       ├── application-dev.yml
│       │       └── db/migration/V1__case_intake_foundation.sql
│       └── test
│           ├── java/com/disputecopilot/*
│           └── resources/application-test.yml
├── frontend
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   ├── playwright.config.ts
│   ├── src/api/cases.ts
│   ├── src/app/App.tsx
│   ├── src/cases/*
│   ├── src/styles.css
│   └── e2e/case-intake.spec.ts
└── dev
    └── merchant-db
        ├── 001-schema.sql
        └── 002-seed.sql
```

---

### Task 1: Scaffold a buildable Spring Boot and React workspace

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/mvnw`
- Create: `backend/mvnw.cmd`
- Create: `backend/.mvn/wrapper/*`
- Create: `backend/src/main/java/com/disputecopilot/DisputeCopilotApplication.java`
- Create: `backend/src/main/java/com/disputecopilot/system/SystemInfoController.java`
- Create: `backend/src/test/java/com/disputecopilot/system/SystemInfoControllerTest.java`
- Create: `frontend/package.json`
- Create: `frontend/package-lock.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/App.tsx`
- Create: `frontend/src/app/App.test.tsx`
- Create: `frontend/src/styles.css`

**Interfaces:**
- Produces: `GET /api/v1/system/info -> SystemInfoResponse(name, version)`.
- Produces: frontend development commands `npm run dev`, `npm test`, and `npm run build`.
- Produces: backend commands `./mvnw test` and `./mvnw spring-boot:run`.

- [ ] **Step 1: Generate the Maven wrapper and create the Spring Boot POM**

Use package `com.disputecopilot`, Java 21, Spring Boot parent `4.1.0`, and these dependencies:

```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
  </dependency>
  <dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
  </dependency>
  <dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
  </dependency>
</dependencies>
```

Configure Surefire to run `*Test` and Failsafe to run `*IT`. Do not add Spring AI, Security, Redis, Kafka, Lombok, or a second build module.

- [ ] **Step 2: Write the failing backend HTTP test**

```java
@WebMvcTest(SystemInfoController.class)
class SystemInfoControllerTest {
  @Autowired MockMvc mvc;

  @Test
  void returnsProductIdentity() throws Exception {
    mvc.perform(get("/api/v1/system/info"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("DisputeCopilot"))
        .andExpect(jsonPath("$.version").isNotEmpty());
  }
}
```

- [ ] **Step 3: Run the focused backend test and confirm red**

Run: `./backend/mvnw -f backend/pom.xml -Dtest=SystemInfoControllerTest test`

Expected: FAIL because `SystemInfoController` does not exist.

- [ ] **Step 4: Implement the minimum controller**

```java
@RestController
@RequestMapping("/api/v1/system")
final class SystemInfoController {
  @GetMapping("/info")
  SystemInfoResponse info() {
    return new SystemInfoResponse("DisputeCopilot", "0.1.0-SNAPSHOT");
  }
}

record SystemInfoResponse(String name, String version) {}
```

- [ ] **Step 5: Run the focused backend test and confirm green**

Run: `./backend/mvnw -f backend/pom.xml -Dtest=SystemInfoControllerTest test`

Expected: PASS, 1 test, 0 failures.

- [ ] **Step 6: Scaffold the React TypeScript workspace and test**

Create the Vite React TypeScript workspace under `frontend`, pin React and React DOM to `19.2.7`, configure Vitest with jsdom, and add Testing Library.

```tsx
it('renders the product shell', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Dispute cases' })).toBeVisible()
})
```

Run: `npm --prefix frontend test -- --run src/app/App.test.tsx`

Expected before implementation: FAIL because `App` does not render the heading.

- [ ] **Step 7: Implement the smallest frontend shell and confirm green**

```tsx
export function App() {
  return <main><h1>Dispute cases</h1></main>
}
```

Run: `npm --prefix frontend test -- --run src/app/App.test.tsx`

Expected: PASS, 1 test, 0 failures.

- [ ] **Step 8: Commit the scaffold**

```bash
git add backend frontend
git commit -m "build: scaffold Spring Boot and React workspace"
```

---

### Task 2: Add PostgreSQL, pgvector, Flyway, and integration-test infrastructure

**Files:**
- Create: `compose.yaml`
- Create: `.env.example`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/resources/application-dev.yml`
- Create: `backend/src/main/resources/db/migration/V1__case_intake_foundation.sql`
- Create: `backend/src/test/java/com/disputecopilot/support/PostgresIntegrationTest.java`
- Create: `backend/src/test/java/com/disputecopilot/persistence/SchemaMigrationIT.java`
- Create: `backend/src/test/resources/application-test.yml`

**Interfaces:**
- Produces tables: `case_record`, `case_snapshot`, `workflow_job`, `workflow_transition`, `idempotency_request`.
- Produces shared Testcontainers base class `PostgresIntegrationTest`.

- [ ] **Step 1: Write the failing migration integration test**

```java
class SchemaMigrationIT extends PostgresIntegrationTest {
  @Autowired JdbcClient jdbc;

  @Test
  void installsVectorAndCaseFoundation() {
    Integer vector = jdbc.sql("select count(*) from pg_extension where extname = 'vector'")
        .query(Integer.class).single();
    Integer tables = jdbc.sql("""
        select count(*) from information_schema.tables
        where table_schema = 'public'
          and table_name in ('case_record','case_snapshot','workflow_job',
                             'workflow_transition','idempotency_request')
        """).query(Integer.class).single();
    assertThat(vector).isEqualTo(1);
    assertThat(tables).isEqualTo(5);
  }
}
```

- [ ] **Step 2: Run the migration test and confirm red**

Run: `./backend/mvnw -f backend/pom.xml -Dit.test=SchemaMigrationIT verify`

Expected: FAIL because no datasource configuration or migration exists.

- [ ] **Step 3: Add the Flyway migration**

Create `V1__case_intake_foundation.sql` with exact enum checks and indexes:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE case_record (
  id uuid PRIMARY KEY,
  order_id varchar(64) NOT NULL,
  dispute_type varchar(40) NOT NULL CHECK (dispute_type = 'PRODUCT_NOT_RECEIVED'),
  state varchar(40) NOT NULL
    CHECK (state IN ('CREATED','FETCHING_DATA','COLLECTING_EVIDENCE','FAILED')),
  failure_code varchar(80),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0
);

CREATE INDEX case_record_created_at_idx ON case_record (created_at DESC);
CREATE INDEX case_record_order_id_idx ON case_record (order_id);

CREATE TABLE case_snapshot (
  case_id uuid PRIMARY KEY REFERENCES case_record(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  source_fetched_at timestamptz NOT NULL,
  source_view_version varchar(32) NOT NULL
);

CREATE TABLE workflow_job (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES case_record(id) ON DELETE CASCADE,
  step varchar(40) NOT NULL CHECK (step = 'FETCHING_DATA'),
  idempotency_key varchar(128) NOT NULL UNIQUE,
  status varchar(24) NOT NULL
    CHECK (status IN ('PENDING','RUNNING','RETRYABLE','COMPLETED','PERMANENT_FAILED')),
  attempt_count integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL,
  locked_by varchar(80),
  lock_expires_at timestamptz,
  last_error_code varchar(80),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (case_id, step)
);

CREATE INDEX workflow_job_claim_idx
  ON workflow_job (status, available_at, created_at);

CREATE TABLE workflow_transition (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES case_record(id) ON DELETE CASCADE,
  from_state varchar(40),
  to_state varchar(40) NOT NULL,
  reason varchar(120) NOT NULL,
  occurred_at timestamptz NOT NULL
);

CREATE TABLE idempotency_request (
  idempotency_key varchar(128) PRIMARY KEY,
  request_hash char(64) NOT NULL,
  case_id uuid NOT NULL REFERENCES case_record(id),
  created_at timestamptz NOT NULL
);

CREATE INDEX workflow_transition_case_time_idx
  ON workflow_transition (case_id, occurred_at);
```

- [ ] **Step 4: Configure application and test datasources**

Set `spring.jpa.hibernate.ddl-auto=validate`, `spring.jpa.open-in-view=false`,
Flyway enabled, JSON timestamps in UTC,
`management.endpoints.web.exposure.include=health,info`, and
`management.endpoint.health.probes.enabled=true`. `PostgresIntegrationTest` must
use one static `PostgreSQLContainer` with image
`pgvector/pgvector:0.8.5-pg18-bookworm` and `@DynamicPropertySource`.

- [ ] **Step 5: Add the local application database service**

At this task, `compose.yaml` contains only PostgreSQL and publishes no ports. Task 8 adds the application service and publishes only its HTTP port on host loopback.

```yaml
services:
  postgres:
    image: pgvector/pgvector:0.8.5-pg18-bookworm
    environment:
      POSTGRES_DB: disputecopilot
      POSTGRES_USER: disputecopilot
      POSTGRES_PASSWORD: ${APP_DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U disputecopilot -d disputecopilot"]
      interval: 5s
      timeout: 3s
      retries: 12

volumes:
  postgres-data:
  document-data:
```

- [ ] **Step 6: Run the migration test and full backend suite**

Run: `./backend/mvnw -f backend/pom.xml verify`

Expected: PASS; pgvector is installed and all five tables exist.

- [ ] **Step 7: Commit the persistence foundation**

```bash
git add compose.yaml .env.example backend/src/main backend/src/test
git commit -m "feat: add PostgreSQL case intake schema"
```

---

### Task 3: Implement the case domain, persistence, and idempotent intake transaction

**Files:**
- Create: `backend/src/main/java/com/disputecopilot/shared/time/ClockConfiguration.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/domain/DisputeType.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/domain/CaseState.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/domain/CaseRecord.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/persistence/CaseEntity.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/persistence/CaseJpaRepository.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/persistence/IdempotencyEntity.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/persistence/IdempotencyJpaRepository.java`
- Create: `backend/src/main/java/com/disputecopilot/workflow/WorkflowJobEntity.java`
- Create: `backend/src/main/java/com/disputecopilot/workflow/WorkflowJobJpaRepository.java`
- Create: `backend/src/main/java/com/disputecopilot/workflow/WorkflowTransitionEntity.java`
- Create: `backend/src/main/java/com/disputecopilot/workflow/WorkflowTransitionJpaRepository.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/service/CaseIntakeService.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/service/IdempotencyConflictException.java`
- Create: `backend/src/test/java/com/disputecopilot/casework/service/CaseIntakeServiceIT.java`

**Interfaces:**
- Consumes: Task 2 schema and repositories.
- Produces: `CaseIntakeService.create(String idempotencyKey, String orderId, DisputeType type) -> CaseRecord`.
- Produces: `CaseRecord` with initial state `CREATED` and one pending `FETCHING_DATA` job.

- [ ] **Step 1: Define exact domain enums and record**

```java
public enum DisputeType { PRODUCT_NOT_RECEIVED }

public enum CaseState {
  CREATED, FETCHING_DATA, COLLECTING_EVIDENCE, FAILED
}

public record CaseRecord(
    UUID id,
    String orderId,
    DisputeType disputeType,
    CaseState state,
    String failureCode,
    Instant createdAt,
    Instant updatedAt) {}
```

- [ ] **Step 2: Write failing idempotency integration tests**

Cover all three behaviors:

```java
@Test
void createsCaseAndFetchJobAtomically() {
  CaseRecord created = service.create(
      "intake-key-1", " ORD-2026-1042 ", DisputeType.PRODUCT_NOT_RECEIVED);

  assertThat(created.orderId()).isEqualTo("ORD-2026-1042");
  assertThat(created.state()).isEqualTo(CaseState.CREATED);
  assertThat(caseRepository.count()).isEqualTo(1);

  WorkflowJobEntity job = jobRepository.findByCaseId(created.id()).orElseThrow();
  assertThat(job.getStep()).isEqualTo("FETCHING_DATA");
  assertThat(job.getIdempotencyKey()).isEqualTo(created.id() + ":FETCHING_DATA");
  assertThat(job.getStatus()).isEqualTo("PENDING");
  assertThat(job.getAvailableAt()).isEqualTo(Instant.parse("2026-08-11T06:30:00Z"));

  List<WorkflowTransitionEntity> transitions =
      transitionRepository.findAllByCaseIdOrderByOccurredAtAsc(created.id());
  assertThat(transitions).singleElement().satisfies(t -> {
    assertThat(t.getFromState()).isNull();
    assertThat(t.getToState()).isEqualTo("CREATED");
    assertThat(t.getReason()).isEqualTo("CASE_ACCEPTED");
  });
}

@Test
void sameKeyAndPayloadReturnsExistingCase() {
  CaseRecord first = service.create(
      "intake-key-2", "ORD-2026-1042", DisputeType.PRODUCT_NOT_RECEIVED);
  CaseRecord second = service.create(
      "intake-key-2", "ORD-2026-1042", DisputeType.PRODUCT_NOT_RECEIVED);

  assertThat(second.id()).isEqualTo(first.id());
  assertThat(caseRepository.count()).isEqualTo(1);
  assertThat(jobRepository.count()).isEqualTo(1);
}

@Test
void sameKeyWithDifferentPayloadThrowsConflict() {
  service.create("intake-key-3", "ORD-2026-1042", DisputeType.PRODUCT_NOT_RECEIVED);

  assertThatThrownBy(() -> service.create(
      "intake-key-3", "ORD-2026-9999", DisputeType.PRODUCT_NOT_RECEIVED))
      .isInstanceOf(IdempotencyConflictException.class);
  assertThat(caseRepository.count()).isEqualTo(1);
}
```

Define `WorkflowJobJpaRepository.findByCaseId(UUID)` and
`WorkflowTransitionJpaRepository.findAllByCaseIdOrderByOccurredAtAsc(UUID)` with
the return types used above. Add a fourth concurrency test using two executor
threads and one idempotency key; both calls must return the same UUID and leave
one case row.

Use a fixed `Clock` at `2026-08-11T06:30:00Z` so timestamps are exact.

- [ ] **Step 3: Run the service tests and confirm red**

Run: `./backend/mvnw -f backend/pom.xml -Dit.test=CaseIntakeServiceIT verify`

Expected: FAIL because `CaseIntakeService` and entities do not exist.

- [ ] **Step 4: Implement the transaction**

`CaseIntakeService.create` is `@Transactional` and must:

1. Trim `orderId` without changing case.
2. Validate the idempotency key against `[A-Za-z0-9._-]{1,128}`.
3. Acquire a transaction-scoped PostgreSQL lock with
   `SELECT pg_advisory_xact_lock(hashtextextended(:idempotencyKey, 0))` before
   reading `idempotency_request`. This serializes concurrent requests for the
   same key without leaving the transaction aborted after a constraint error.
4. Calculate `sha256(orderId + "\n" + disputeType.name())` as lowercase hex.
5. Return the existing case when key and hash match.
6. Throw `IdempotencyConflictException` when the key exists with a different hash.
7. Save `case_record` in `CREATED`.
8. Save transition `null -> CREATED` with reason `CASE_ACCEPTED`.
9. Save one `workflow_job` with step `FETCHING_DATA`, idempotency key
   `{caseId}:FETCHING_DATA`, status `PENDING`, and `available_at=now`.
10. Save the idempotency record.
11. Commit all four records or none.

Execute the advisory-lock query through the primary application `JdbcClient` and
consume its single row before repository access. Hash collisions can serialize
unrelated requests but cannot merge or corrupt them because the full key remains
the primary key and is always compared afterward.

- [ ] **Step 5: Run the focused tests and confirm green**

Run: `./backend/mvnw -f backend/pom.xml -Dit.test=CaseIntakeServiceIT verify`

Expected: PASS, 4 tests, 0 failures, including the two-thread idempotency test.

- [ ] **Step 6: Run the full backend suite**

Run: `./backend/mvnw -f backend/pom.xml verify`

Expected: PASS with no migration or controller regression.

- [ ] **Step 7: Commit case intake persistence**

```bash
git add backend/src/main/java/com/disputecopilot backend/src/test/java/com/disputecopilot
git commit -m "feat: persist idempotent dispute case intake"
```

---

### Task 4: Implement the allowlisted read-only merchant connector

**Files:**
- Create: `dev/merchant-db/001-schema.sql`
- Create: `dev/merchant-db/002-seed.sql`
- Create: `compose.demo.yaml`
- Create: `backend/src/main/java/com/disputecopilot/connector/MerchantDataSourceProperties.java`
- Create: `backend/src/main/java/com/disputecopilot/connector/MerchantDataSourceConfiguration.java`
- Create: `backend/src/main/java/com/disputecopilot/connector/CaseBundle.java`
- Create: `backend/src/main/java/com/disputecopilot/connector/MerchantCaseConnector.java`
- Create: `backend/src/main/java/com/disputecopilot/connector/JdbcMerchantCaseConnector.java`
- Create: `backend/src/main/java/com/disputecopilot/connector/OrderNotFoundException.java`
- Create: `backend/src/test/java/com/disputecopilot/connector/JdbcMerchantCaseConnectorIT.java`

**Interfaces:**
- Produces: `MerchantCaseConnector.fetchByOrderId(String orderId) -> CaseBundle`
  and `sourceViewVersion() -> "v1"`.
- Produces fixture order: `ORD-2026-1042`.
- Guarantees: one SELECT-only view query; no user/LLM SQL.

- [ ] **Step 1: Create the fixture source schema and role**

The schema script creates base fixture tables, `dispute_case_view`, and login `dispute_reader`. Grant `CONNECT`, schema `USAGE`, and `SELECT` on the view only. Explicitly revoke create and all DML privileges.

The view exposes these exact columns:

```text
order_id, ordered_at, currency, total_amount,
payment_reference, payment_status, paid_at,
shipment_reference, carrier, tracking_number, shipment_status,
delivered_at, delivery_evidence_reference,
refund_status, latest_customer_message, latest_customer_message_at
```

Seed `ORD-2026-1042` with the fictional dates and references used in the approved mockup.

Define the connector result exactly as nested immutable records:

```java
public record CaseBundle(
    String orderId,
    Instant orderedAt,
    String currency,
    BigDecimal totalAmount,
    Payment payment,
    Fulfillment fulfillment,
    Refund refund,
    Communication latestCustomerCommunication) {

  public record Payment(String reference, String status, Instant paidAt) {}

  public record Fulfillment(
      String reference,
      String carrier,
      String trackingNumber,
      String status,
      Instant deliveredAt,
      String deliveryEvidenceReference) {}

  public record Refund(String status) {}

  public record Communication(String message, Instant observedAt) {}
}
```

- [ ] **Step 2: Write failing connector integration tests**

```java
@Test
void fetchesOnlyTheRequestedOrderIntoTypedBundle() {
  CaseBundle bundle = connector.fetchByOrderId("ORD-2026-1042");

  assertThat(bundle.orderId()).isEqualTo("ORD-2026-1042");
  assertThat(bundle.currency()).isEqualTo("INR");
  assertThat(bundle.totalAmount()).isEqualByComparingTo("4299.00");
  assertThat(bundle.payment().reference()).isEqualTo("PAY-88421");
  assertThat(bundle.fulfillment().reference()).isEqualTo("SHP-55492");
  assertThat(bundle.fulfillment().deliveryEvidenceReference()).isEqualTo("EVT-223102");
  assertThat(bundle.latestCustomerCommunication().message()).contains("not received");
}

@Test
void rejectsUnknownOrder() {
  assertThatThrownBy(() -> connector.fetchByOrderId("ORD-DOES-NOT-EXIST"))
      .isInstanceOf(OrderNotFoundException.class);
}

@Test
void treatsSqlMetacharactersAsOrderIdData() {
  assertThatThrownBy(() -> connector.fetchByOrderId("x' OR 1=1 --"))
      .isInstanceOf(OrderNotFoundException.class);
}

@Test
void readerCannotModifySourceTables() {
  assertThatThrownBy(() -> merchantJdbcClient.sql(
      "insert into merchant_order(order_id) values ('FORBIDDEN')").update())
      .isInstanceOf(DataAccessException.class)
      .hasMessageContaining("permission denied");
}
```

- [ ] **Step 3: Run the connector tests and confirm red**

Run: `./backend/mvnw -f backend/pom.xml -Dit.test=JdbcMerchantCaseConnectorIT verify`

Expected: FAIL because connector configuration and fixture do not exist.

- [ ] **Step 4: Implement the typed connector**

The only production query in `JdbcMerchantCaseConnector` is:

```java
private static final String CASE_QUERY = """
    SELECT order_id, ordered_at, currency, total_amount,
           payment_reference, payment_status, paid_at,
           shipment_reference, carrier, tracking_number, shipment_status,
           delivered_at, delivery_evidence_reference,
           refund_status, latest_customer_message, latest_customer_message_at
    FROM dispute_case_view
    WHERE order_id = :orderId
    LIMIT 1
    """;
```

Keep the application datasource under `spring.datasource` and mark it primary. Create a qualified `merchantDataSource`, `merchantJdbcClient`, and `merchantTransactionManager` under `disputecopilot.merchant-datasource`. Configure Hikari with `readOnly=true`, `maximumPoolSize=3`, `connectionTimeout=3000`, and `autoCommit=false`. Wrap the query in `@Transactional(transactionManager="merchantTransactionManager", readOnly=true)` and map it to the immutable `CaseBundle` record above.

- [ ] **Step 5: Add the demo Compose override**

`compose.demo.yaml` adds `merchant-fixture`, mounts the two SQL scripts into
`/docker-entrypoint-initdb.d`, and overrides application merchant JDBC settings.
Mount its PostgreSQL 18 data volume at `/var/lib/postgresql`, and publish no
merchant database port. The fixed `dispute_reader` password is fixture-only and
must be labeled as such; real connector credentials come from environment
variables in Plan 2.

- [ ] **Step 6: Run connector tests and full backend suite**

Run: `./backend/mvnw -f backend/pom.xml verify`

Expected: PASS; the reader can select the view and cannot perform DML.

- [ ] **Step 7: Commit the merchant connector**

```bash
git add dev compose.demo.yaml backend/src/main/java/com/disputecopilot/connector backend/src/test/java/com/disputecopilot/connector
git commit -m "feat: add read-only merchant order connector"
```

---

### Task 5: Execute the durable fetch-data workflow

**Files:**
- Create: `backend/src/main/java/com/disputecopilot/casework/persistence/CaseSnapshotEntity.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/persistence/CaseSnapshotJpaRepository.java`
- Create: `backend/src/main/java/com/disputecopilot/workflow/ClaimedWorkflowJob.java`
- Create: `backend/src/main/java/com/disputecopilot/workflow/WorkflowJobClaimRepository.java`
- Create: `backend/src/main/java/com/disputecopilot/workflow/WorkflowJobService.java`
- Create: `backend/src/main/java/com/disputecopilot/workflow/LostWorkflowLeaseException.java`
- Create: `backend/src/main/java/com/disputecopilot/workflow/RetryPolicy.java`
- Create: `backend/src/main/java/com/disputecopilot/workflow/CaseDataFetchHandler.java`
- Create: `backend/src/main/java/com/disputecopilot/workflow/WorkflowWorker.java`
- Create: `backend/src/test/java/com/disputecopilot/workflow/WorkflowWorkerIT.java`

**Interfaces:**
- Consumes: `MerchantCaseConnector.fetchByOrderId` and pending `FETCHING_DATA` jobs.
- Produces: stored `CaseBundle`, state `COLLECTING_EVIDENCE`, completed job, and transition history.
- Produces: retry delays `5s` after attempt one and `30s` after attempt two; attempt three is final.

- [ ] **Step 1: Write failing workflow integration tests**

Test these behaviors with a fake connector and fixed clock:

```java
@Test
void successfulFetchStoresSnapshotAndAdvancesCase() {
  UUID caseId = createCase("worker-success");
  connector.returnBundle(fixtureBundle());

  worker.tick();

  assertThat(caseRepository.findById(caseId).orElseThrow().getState())
      .isEqualTo("COLLECTING_EVIDENCE");
  assertThat(snapshotRepository.findById(caseId).orElseThrow().getPayload().orderId())
      .isEqualTo("ORD-2026-1042");
  assertThat(jobFor(caseId).getStatus()).isEqualTo("COMPLETED");
  assertThat(transitionReasons(caseId))
      .containsExactly("CASE_ACCEPTED", "FETCH_STARTED", "DATA_FETCHED");
}

@Test
void unknownOrderPermanentlyFailsWithoutRetry() {
  UUID caseId = createCase("worker-not-found");
  connector.throwOnFetch(new OrderNotFoundException("ORD-2026-1042"));

  worker.tick();

  assertThat(caseRepository.findById(caseId).orElseThrow().getFailureCode())
      .isEqualTo("ORDER_NOT_FOUND");
  assertThat(jobFor(caseId).getStatus()).isEqualTo("PERMANENT_FAILED");
}

@Test
void transientFailureSchedulesFiveSecondRetry() {
  UUID caseId = createCase("worker-retry");
  connector.throwOnFetch(new TransientDataAccessResourceException("timeout"));

  worker.tick();

  WorkflowJobEntity job = jobFor(caseId);
  assertThat(job.getStatus()).isEqualTo("RETRYABLE");
  assertThat(job.getAttemptCount()).isEqualTo(1);
  assertThat(job.getAvailableAt()).isEqualTo(clock.instant().plusSeconds(5));
}

@Test
void thirdTransientFailureMarksCaseFailed() {
  UUID caseId = createCase("worker-exhausted");
  connector.throwOnFetch(new TransientDataAccessResourceException("timeout"));

  worker.tick();
  clock.advance(Duration.ofSeconds(5));
  worker.tick();
  assertThat(jobFor(caseId).getAvailableAt()).isEqualTo(clock.instant().plusSeconds(30));
  clock.advance(Duration.ofSeconds(30));
  worker.tick();

  assertThat(jobFor(caseId).getStatus()).isEqualTo("PERMANENT_FAILED");
  assertThat(caseRepository.findById(caseId).orElseThrow().getFailureCode())
      .isEqualTo("CONNECTOR_UNAVAILABLE");
}

@Test
void twoClaimersCannotReceiveTheSameJob() throws Exception {
  UUID caseId = createCase("worker-concurrency");
  try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Optional<ClaimedWorkflowJob>> claims = pool.invokeAll(List.of(
            () -> claimRepository.claimNext("worker-a", clock.instant()),
            () -> claimRepository.claimNext("worker-b", clock.instant())))
        .stream().map(Future::get).toList();
    assertThat(claims).filteredOn(Optional::isPresent).hasSize(1);
    assertThat(claims.stream().flatMap(Optional::stream).map(ClaimedWorkflowJob::caseId))
        .containsExactly(caseId);
  }
}

@Test
void expiredRunningJobIsReclaimedAfterProcessCrash() {
  UUID caseId = createCase("worker-recovery");
  markJobRunningWithExpiredLock(caseId, clock.instant().minusSeconds(1));

  Optional<ClaimedWorkflowJob> reclaimed =
      claimRepository.claimNext("replacement-worker", clock.instant());

  assertThat(reclaimed).isPresent();
  assertThat(reclaimed.orElseThrow().caseId()).isEqualTo(caseId);
  assertThat(reclaimed.orElseThrow().workerId()).isEqualTo("replacement-worker");
}

@Test
void staleWorkerCannotCommitAfterItsLeaseIsReclaimed() {
  UUID caseId = createCase("worker-stale-result");
  ClaimedWorkflowJob stale = claimRepository
      .claimNext("slow-worker", clock.instant()).orElseThrow();
  clock.advance(Duration.ofSeconds(31));
  ClaimedWorkflowJob replacement = claimRepository
      .claimNext("replacement-worker", clock.instant()).orElseThrow();

  assertThatThrownBy(() -> jobService.completeFetch(
      stale, fixtureBundle(), clock.instant(), "v1"))
      .isInstanceOf(LostWorkflowLeaseException.class);
  assertThat(snapshotRepository.findById(caseId)).isEmpty();
  assertThat(replacement.workerId()).isEqualTo("replacement-worker");
}
```

Create `MutableClock` under test sources with `instant()`, `getZone()`,
`withZone(ZoneId)`, and `advance(Duration)`. Test helpers `createCase`, `jobFor`,
`transitionReasons`, and `markJobRunningWithExpiredLock` must use repositories
directly and clear their rows in `@BeforeEach`; they must not hide calls to the
worker or connector.

- [ ] **Step 2: Run the worker tests and confirm red**

Run: `./backend/mvnw -f backend/pom.xml -Dit.test=WorkflowWorkerIT verify`

Expected: FAIL because the claim repository and worker do not exist.

- [ ] **Step 3: Implement atomic job claiming**

Use one PostgreSQL statement ending in `RETURNING`:

```sql
WITH candidate AS (
  SELECT id
  FROM workflow_job
  WHERE (
      status IN ('PENDING', 'RETRYABLE')
      AND available_at <= :now
    ) OR (
      status = 'RUNNING'
      AND lock_expires_at < :now
    )
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE workflow_job j
SET status = 'RUNNING',
    locked_by = :workerId,
    lock_expires_at = :lockExpiresAt,
    attempt_count = attempt_count + 1,
    updated_at = :now
FROM candidate
WHERE j.id = candidate.id
RETURNING j.id, j.case_id, j.step, j.attempt_count,
          j.locked_by AS worker_id, j.lock_expires_at;
```

Do not keep a database transaction open during the merchant database call.

Define the claimed job contract as:

```java
public record ClaimedWorkflowJob(
    UUID id,
    UUID caseId,
    String step,
    int attemptCount,
    String workerId,
    Instant lockExpiresAt) {}
```

Use a 30-second lease. Every completion, retry, or permanent-failure update must
lock the job row and verify both `status='RUNNING'` and
`locked_by=claimedJob.workerId()`. If ownership changed after lease expiry, throw
`LostWorkflowLeaseException` and discard the stale worker result without changing
the case or snapshot.

- [ ] **Step 4: Implement success and failure transactions**

On success, one application-database transaction must:

1. Insert the immutable JSONB snapshot using Hibernate `@JdbcTypeCode(SqlTypes.JSON)`.
2. Mark the job `COMPLETED` and clear its lock.
3. Transition the case from `CREATED` or `FETCHING_DATA` to `COLLECTING_EVIDENCE`.
4. Append `DATA_FETCHED` to `workflow_transition`.

Before the connector call, transition `CREATED -> FETCHING_DATA` with reason `FETCH_STARTED`.

On `OrderNotFoundException`, mark the job `PERMANENT_FAILED`, case `FAILED`, failure code `ORDER_NOT_FOUND`, and append `ORDER_LOOKUP_FAILED`.

On transient data-access errors after attempts one and two, mark `RETRYABLE` with delays of five and thirty seconds respectively. After attempt three, mark the job `PERMANENT_FAILED` and the case `FAILED` with `CONNECTOR_UNAVAILABLE`.

`WorkflowJobService` exposes `markFetchStarted(ClaimedWorkflowJob)`,
`completeFetch(ClaimedWorkflowJob, CaseBundle, Instant, String sourceViewVersion)`,
`scheduleRetry(ClaimedWorkflowJob, Instant)`, and
`failPermanently(ClaimedWorkflowJob, String)`. Each is an application-database
transaction with the lease check above. `CaseDataFetchHandler.handle(job)` calls
`markFetchStarted`, performs the connector read outside those transactions, and
routes the result or typed exception to exactly one terminal service method.
On success it passes `clock.instant()` and `connector.sourceViewVersion()` to
`completeFetch` so the snapshot provenance comes from the connector contract.

- [ ] **Step 5: Schedule the worker safely**

`WorkflowWorker.tick()` uses `@Scheduled(fixedDelayString="${disputecopilot.workflow.poll-delay:1000}")`, generates a stable process worker ID at startup, and processes at most one job per invocation. Disable scheduling in tests and call `tick()` directly.

- [ ] **Step 6: Run focused and full backend verification**

Run: `./backend/mvnw -f backend/pom.xml verify`

Expected: PASS; concurrency test proves one claim, retry tests use exact delays, snapshot test reaches `COLLECTING_EVIDENCE`.

- [ ] **Step 7: Commit the durable workflow**

```bash
git add backend/src/main/java/com/disputecopilot backend/src/test/java/com/disputecopilot
git commit -m "feat: fetch and persist merchant case snapshots"
```

---

### Task 6: Expose the case intake and read API with problem details

**Files:**
- Create: `backend/src/main/java/com/disputecopilot/casework/api/CreateCaseRequest.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/api/CaseSummaryResponse.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/api/CasePageResponse.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/api/CaseSnapshotResponse.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/api/CaseDetailResponse.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/api/CaseResponseMapper.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/api/CaseController.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/domain/CaseDetail.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/domain/SourceSnapshot.java`
- Create: `backend/src/main/java/com/disputecopilot/casework/service/CaseQueryService.java`
- Create: `backend/src/main/java/com/disputecopilot/shared/api/CorrelationIdFilter.java`
- Create: `backend/src/main/java/com/disputecopilot/shared/api/ProblemDetailsAdvice.java`
- Create: `backend/src/test/java/com/disputecopilot/casework/api/CaseControllerIT.java`

**Interfaces:**
- Produces: `POST /api/v1/cases`, `GET /api/v1/cases`, `GET /api/v1/cases/{caseId}`.
- Produces: `GET /api/v1/cases?page=0&size=20` as `CasePageResponse`,
  newest first, default size 20, maximum size 100.
- Produces: RFC 9457 `application/problem+json` responses with correlation IDs.
- Produces: `CaseQueryService.list(int page, int size) -> Page<CaseRecord>` and
  `CaseQueryService.get(UUID caseId) -> CaseDetail`; both are read-only
  transactions and return domain data rather than API response records.

- [ ] **Step 1: Define exact request and response records**

```java
public record CreateCaseRequest(
    @NotBlank @Size(max = 64) String orderId,
    @NotNull DisputeType disputeType) {}

public record CaseSummaryResponse(
    UUID caseId, String orderId, DisputeType disputeType,
    CaseState state, String failureCode, Instant createdAt, Instant updatedAt) {}

public record CasePageResponse(
    List<CaseSummaryResponse> items,
    int page,
    int size,
    long totalElements,
    int totalPages) {}

public record CaseDetailResponse(
    UUID caseId, String orderId, DisputeType disputeType,
    CaseState state, String failureCode, Instant createdAt, Instant updatedAt,
    CaseSnapshotResponse snapshot) {}

public record CaseSnapshotResponse(
    String orderId, Instant orderedAt, String currency, BigDecimal totalAmount,
    CaseBundle.Payment payment,
    CaseBundle.Fulfillment fulfillment,
    CaseBundle.Refund refund,
    CaseBundle.Communication latestCustomerCommunication,
    Instant sourceFetchedAt,
    String sourceViewVersion) {}

public record SourceSnapshot(
    CaseBundle bundle, Instant sourceFetchedAt, String sourceViewVersion) {}

public record CaseDetail(CaseRecord caseRecord, SourceSnapshot snapshot) {}
```

- [ ] **Step 2: Write failing API integration tests**

Cover:

- `POST` without `Idempotency-Key` returns 400 problem details.
- Valid `POST` returns 202 and `Location: /api/v1/cases/{id}`.
- Repeated key/payload returns the same case ID.
- Reused key/different payload returns 409.
- Blank/oversized order IDs return 400.
- `GET` unknown UUID returns 404.
- List is ordered newest first, defaults to 20 items, includes page metadata,
  rejects negative values, and caps `size` at 100.
- Detail returns `snapshot=null` before fetch and populated snapshot afterward.

Implement the HTTP contract through `MockMvc`; the controller test must not call
the service directly:

```java
@Test
void requiresIdempotencyKey() throws Exception {
  mvc.perform(post("/api/v1/cases")
          .contentType(APPLICATION_JSON)
          .content("""
              {"orderId":"ORD-2026-1042","disputeType":"PRODUCT_NOT_RECEIVED"}
              """))
      .andExpect(status().isBadRequest())
      .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
      .andExpect(jsonPath("$.type").value(endsWith("/invalid-request")))
      .andExpect(header().exists("X-Correlation-ID"));
}

@Test
void acceptsCaseAndReturnsStableLocationForRepeatedRequest() throws Exception {
  String body = """
      {"orderId":"ORD-2026-1042","disputeType":"PRODUCT_NOT_RECEIVED"}
      """;
  MvcResult first = mvc.perform(post("/api/v1/cases")
          .header("Idempotency-Key", "api-key-1042")
          .contentType(APPLICATION_JSON)
          .content(body))
      .andExpect(status().isAccepted())
      .andExpect(jsonPath("$.state").value("CREATED"))
      .andReturn();
  String firstId = objectMapper.readTree(first.getResponse().getContentAsString())
      .get("caseId").asText();

  mvc.perform(post("/api/v1/cases")
          .header("Idempotency-Key", "api-key-1042")
          .contentType(APPLICATION_JSON)
          .content(body))
      .andExpect(status().isAccepted())
      .andExpect(jsonPath("$.caseId").value(firstId))
      .andExpect(header().string("Location", "/api/v1/cases/" + firstId));

  assertThat(caseRepository.count()).isEqualTo(1);
}

@Test
void rejectsIdempotencyKeyReusedForDifferentOrder() throws Exception {
  createThroughApi("api-key-conflict", "ORD-2026-1042");

  mvc.perform(post("/api/v1/cases")
          .header("Idempotency-Key", "api-key-conflict")
          .contentType(APPLICATION_JSON)
          .content("""
              {"orderId":"ORD-2026-9999","disputeType":"PRODUCT_NOT_RECEIVED"}
              """))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.type").value(endsWith("/idempotency-conflict")));
}

private void createThroughApi(String key, String orderId) throws Exception {
  mvc.perform(post("/api/v1/cases")
          .header("Idempotency-Key", key)
          .contentType(APPLICATION_JSON)
          .content("""
              {"orderId":"%s","disputeType":"PRODUCT_NOT_RECEIVED"}
              """.formatted(orderId)))
      .andExpect(status().isAccepted());
}
```

For the remaining cases, create 21 cases using a mutable test clock and assert
that `GET /api/v1/cases` returns `$.items` length 20, `$.totalElements` equal to
21, and the newest order at `$.items[0]`. Assert an unknown UUID returns
`case-not-found`. For the detail transition,
create through the API, assert `$.snapshot` is null, call `workflowWorker.tick()`
against the merchant fixture, then assert the payment reference and fulfillment
event IDs at `$.snapshot.payment.reference` and
`$.snapshot.fulfillment.deliveryEvidenceReference`.

- [ ] **Step 3: Run the controller tests and confirm red**

Run: `./backend/mvnw -f backend/pom.xml -Dit.test=CaseControllerIT verify`

Expected: FAIL because endpoints do not exist.

- [ ] **Step 4: Implement controller, mapping, and problem details**

The controller delegates all business behavior to services. It does not access repositories directly. `CorrelationIdFilter` validates an incoming ID against `[A-Za-z0-9._-]{1,80}`, otherwise generates a UUID, stores it as a request attribute, and writes `X-Correlation-ID` on the response. `ProblemDetailsAdvice` includes that value in problem detail properties. Map validation to stable type URI suffixes such as `invalid-request`, idempotency reuse to `idempotency-conflict`, and missing case to `case-not-found`.

- [ ] **Step 5: Run contract and full backend tests**

Run: `./backend/mvnw -f backend/pom.xml verify`

Expected: PASS with exact status codes, headers, JSON enums, and timestamps.

- [ ] **Step 6: Commit the API**

```bash
git add backend/src/main/java/com/disputecopilot/casework backend/src/main/java/com/disputecopilot/shared/api backend/src/test/java/com/disputecopilot/casework/api
git commit -m "feat: expose dispute case intake API"
```

---

### Task 7: Build the React case intake, list, and source snapshot UI

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/app/App.tsx`
- Create: `frontend/src/api/http.ts`
- Create: `frontend/src/api/cases.ts`
- Create: `frontend/src/api/cases.test.ts`
- Create: `frontend/src/cases/CaseListPage.tsx`
- Create: `frontend/src/cases/NewCaseDialog.tsx`
- Create: `frontend/src/cases/CaseDetailPage.tsx`
- Create: `frontend/src/cases/useCasePolling.ts`
- Create: `frontend/src/test/caseFactories.ts`
- Create: `frontend/src/cases/CaseListPage.test.tsx`
- Create: `frontend/src/cases/NewCaseDialog.test.tsx`
- Create: `frontend/src/cases/CaseDetailPage.test.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: Task 6 case API.
- Produces: hash routes `#/cases` and `#/cases/{caseId}`.
- Produces: polling every two seconds while state is `CREATED` or `FETCHING_DATA`.
- Produces: `NewCaseDialog({open, onClose, onCreated})`, where `onCreated`
  receives the new case UUID.

- [ ] **Step 1: Define frontend API types and error contract**

```ts
export type DisputeType = 'PRODUCT_NOT_RECEIVED'
export type CaseState = 'CREATED' | 'FETCHING_DATA' | 'COLLECTING_EVIDENCE' | 'FAILED'

export interface CaseSummary {
  caseId: string
  orderId: string
  disputeType: DisputeType
  state: CaseState
  failureCode: string | null
  createdAt: string
  updatedAt: string
}

export interface CasePage {
  items: CaseSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface CaseSnapshot {
  orderId: string
  orderedAt: string
  currency: string
  totalAmount: number
  payment: { reference: string; status: string; paidAt: string }
  fulfillment: {
    reference: string
    carrier: string
    trackingNumber: string
    status: string
    deliveredAt: string | null
    deliveryEvidenceReference: string | null
  }
  refund: { status: string }
  latestCustomerCommunication: { message: string; observedAt: string }
  sourceFetchedAt: string
  sourceViewVersion: string
}

export interface CaseDetail extends CaseSummary {
  snapshot: CaseSnapshot | null
}

export interface CreateCaseInput {
  orderId: string
  disputeType: DisputeType
}
```

Expose `createCase(input): Promise<CaseSummary>`,
`listCases(page = 0, size = 20): Promise<CasePage>`, and
`getCase(caseId): Promise<CaseDetail>`. `createCase` generates one UUID
idempotency key per function call and performs at most one automatic retry for a
network `TypeError`, reusing the same key. It never retries an HTTP response.

`ApiProblem` is a concrete `Error` subclass with `status`, `type`, `detail`, and
`correlationId` fields. Its constructor is
`ApiProblem(status, detail, type = 'about:blank', correlationId = null)`.
`src/api/http.ts` parses `application/problem+json` into that class and never
displays raw response bodies or stack traces.

- [ ] **Step 2: Write failing case-list and intake tests**

First, pin the browser idempotency behavior in `src/api/cases.test.ts`:

```ts
it('reuses the idempotency key for one network retry', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
    .mockRejectedValueOnce(new TypeError('connection reset'))
    .mockResolvedValueOnce(new Response(JSON.stringify(caseSummary()), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    }))

  await createCase({
    orderId: 'ORD-2026-1042',
    disputeType: 'PRODUCT_NOT_RECEIVED'
  })

  expect(fetchMock).toHaveBeenCalledTimes(2)
  const firstKey = new Headers(fetchMock.mock.calls[0][1]?.headers)
      .get('Idempotency-Key')
  const secondKey = new Headers(fetchMock.mock.calls[1][1]?.headers)
      .get('Idempotency-Key')
  expect(firstKey).toMatch(/^[0-9a-f-]{36}$/)
  expect(secondKey).toBe(firstKey)
})
```

Mock the typed functions from `src/api/cases.ts`; do not duplicate HTTP behavior
inside component tests. Add `@testing-library/user-event` and implement:

```tsx
const apiMocks = vi.hoisted(() => ({
  createCase: vi.fn(),
  listCases: vi.fn(),
  getCase: vi.fn()
}))
vi.mock('../api/cases', () => apiMocks)
const {
  createCase: createCaseMock,
  listCases: listCasesMock,
  getCase: getCaseMock
} = apiMocks

it('submits an order ID and opens the created case', async () => {
  createCaseMock.mockResolvedValue(caseSummary({ caseId: 'case-1042' }))
  const onCreated = vi.fn()
  render(<NewCaseDialog open onClose={vi.fn()} onCreated={onCreated} />)

  await userEvent.type(screen.getByLabelText('Merchant order ID'), 'ORD-2026-1042')
  await userEvent.click(screen.getByRole('button', { name: 'Start investigation' }))

  await waitFor(() => expect(createCaseMock).toHaveBeenCalledWith({
    orderId: 'ORD-2026-1042',
    disputeType: 'PRODUCT_NOT_RECEIVED'
  }))
  expect(onCreated).toHaveBeenCalledWith('case-1042')
})

it('shows the API problem detail without losing the order ID', async () => {
  createCaseMock.mockRejectedValue(new ApiProblem(503, 'Case intake unavailable'))
  render(<NewCaseDialog open onClose={vi.fn()} onCreated={vi.fn()} />)
  const orderId = screen.getByLabelText('Merchant order ID')

  await userEvent.type(orderId, 'ORD-MISSING')
  await userEvent.click(screen.getByRole('button', { name: 'Start investigation' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Case intake unavailable')
  expect(orderId).toHaveValue('ORD-MISSING')
})

it('does not offer any dispute type except product not received', () => {
  render(<NewCaseDialog open onClose={vi.fn()} onCreated={vi.fn()} />)
  expect(screen.getByLabelText('Dispute type')).toHaveValue('PRODUCT_NOT_RECEIVED')
  expect(screen.getAllByRole('option')).toHaveLength(1)
})

it('lists recent cases with accessible state text', async () => {
  listCasesMock.mockResolvedValue({
    items: [caseSummary({ orderId: 'ORD-2026-1042', state: 'FETCHING_DATA' })],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1
  })
  render(<MemoryRouter><CaseListPage /></MemoryRouter>)

  expect(await screen.findByText('ORD-2026-1042')).toBeVisible()
  expect(screen.getByText('Fetching data')).toBeVisible()
})
```

Provide a `caseSummary(overrides)` test factory containing every `CaseSummary`
field and a `caseDetail(overrides)` factory containing every detail and nested
snapshot field; do not cast partial objects to production types. Place both in
`src/test/caseFactories.ts`, along with a deterministic `fixtureSnapshot` whose
payment reference is `PAY-88421` and fulfillment event is `EVT-223102`.

Run: `npm --prefix frontend test -- --run src/cases`

Expected: FAIL because pages and API client do not exist.

- [ ] **Step 3: Implement case list and investigation dialog**

Follow the approved mockup rather than introducing a component library. Include:

- Product navigation shell.
- Recent case table.
- New investigation button and dialog.
- Order ID field and fixed product-not-received type.
- Plan-accurate notice: `This step reads one order-scoped row into the merchant-local application. No data is sent to a model provider yet.`
- Loading, inline problem detail, and retry states.

- [ ] **Step 4: Write failing detail and polling tests**

```tsx
it('polls until the source snapshot is ready and then stops', async () => {
  vi.useFakeTimers()
  getCaseMock
    .mockResolvedValueOnce(caseDetail({ state: 'CREATED', snapshot: null }))
    .mockResolvedValueOnce(caseDetail({ state: 'COLLECTING_EVIDENCE', snapshot: fixtureSnapshot }))

  const { result } = renderHook(() => useCasePolling('case-1042'))
  await waitFor(() => expect(result.current.data?.state).toBe('CREATED'))
  await vi.advanceTimersByTimeAsync(2_000)
  await waitFor(() => expect(result.current.data?.state).toBe('COLLECTING_EVIDENCE'))
  await vi.advanceTimersByTimeAsync(4_000)

  expect(getCaseMock).toHaveBeenCalledTimes(2)
})

it('stops polling and shows an actionable failure', async () => {
  getCaseMock.mockResolvedValue(caseDetail({
    state: 'FAILED', failureCode: 'ORDER_NOT_FOUND', snapshot: null
  }))
  render(<MemoryRouter initialEntries={['/cases/case-1042']}>
    <Routes><Route path="/cases/:caseId" element={<CaseDetailPage />} /></Routes>
  </MemoryRouter>)

  expect(await screen.findByRole('alert')).toHaveTextContent('Order not found')
  expect(screen.getByRole('button', { name: 'Back to cases' })).toBeVisible()
})

it('renders source references without calling them verified evidence', async () => {
  getCaseMock.mockResolvedValue(caseDetail({
    state: 'COLLECTING_EVIDENCE', snapshot: fixtureSnapshot
  }))
  render(<MemoryRouter initialEntries={['/cases/case-1042']}>
    <Routes><Route path="/cases/:caseId" element={<CaseDetailPage />} /></Routes>
  </MemoryRouter>)

  expect(await screen.findByText('PAY-88421')).toBeVisible()
  expect(screen.getByText('EVT-223102')).toBeVisible()
  expect(screen.queryByText(/verified evidence/i)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
})
```

Use `afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })` so a failed
polling assertion cannot leak fake timers into later component tests.

- [ ] **Step 5: Implement case detail and polling**

The detail page displays:

- Order and case IDs.
- Current workflow state.
- Order, payment, fulfillment, refund, and latest communication fields from the snapshot.
- Source timestamp and view version.
- A clear banner: `Data collected. Evidence Collector is the next implementation phase.`

Do not show a recommendation, confidence, policy citation, or approval button in Plan 1 because no agent or RAG stage exists yet.

- [ ] **Step 6: Configure Vite development proxy and verify frontend**

Proxy `/api` to `http://127.0.0.1:8080`. Use `HashRouter` so the packaged Spring Boot app requires no SPA fallback controller.
Redirect the empty hash route and unknown hash routes to `/cases`; selecting a
row or creating a case navigates to `/cases/{caseId}`.

Run:

```bash
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

Expected: all component tests pass and `frontend/dist` builds without TypeScript errors.

- [ ] **Step 7: Commit the browser flow**

```bash
git add frontend
git commit -m "feat: add case intake and snapshot workspace"
```

---

### Task 8: Package the two-container demo and verify the vertical slice end to end

**Files:**
- Create: `Dockerfile`
- Modify: `compose.yaml`
- Modify: `compose.demo.yaml`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/case-intake.spec.ts`
- Modify: `README.md`
- Modify: `docs/deployment-runbook.md`

**Interfaces:**
- Consumes: all prior Plan 1 tasks.
- Produces: `docker compose -f compose.yaml -f compose.demo.yaml up --build` demo.
- Produces: browser path from new investigation to persisted source snapshot.

- [ ] **Step 1: Write the failing Playwright journey**

```ts
test('creates an investigation and displays the fetched order snapshot', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New investigation' }).click()
  await page.getByLabel('Merchant order ID').fill('ORD-2026-1042')
  await page.getByRole('button', { name: 'Start investigation' }).click()
  await expect(page.getByRole('heading', { name: 'ORD-2026-1042' })).toBeVisible()
  await expect(page.getByText('Data collected. Evidence Collector is the next implementation phase.'))
      .toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('PAY-88421')).toBeVisible()
  await expect(page.getByText('EVT-223102')).toBeVisible()
})
```

Run against the unbuilt stack and confirm it fails because the application image does not exist.

- [ ] **Step 2: Create the multi-stage Docker image**

Use these stages:

1. `node:24-alpine` runs `npm ci` and `npm run build`.
2. `eclipse-temurin:21-jdk` copies backend plus `frontend/dist` into `backend/src/main/resources/static`, then runs the Maven wrapper with `-DskipTests package`.
3. `eclipse-temurin:21-jre` installs only `curl` for the container healthcheck,
   clears the package cache, runs as a non-root numeric user, exposes 8080,
   creates `/var/lib/disputecopilot/documents`, and starts the executable JAR.

Add a container healthcheck against `/actuator/health/readiness`.

- [ ] **Step 3: Complete Compose wiring**

The default `compose.yaml` contains only `app` and application `postgres`. It mounts `document-data` and publishes `127.0.0.1:8080:8080`.

The demo override adds the merchant fixture, supplies the read-only JDBC settings to `app`, and waits on both database healthchecks. No database port is published.

- [ ] **Step 4: Add development and demo commands to documentation**

Document exact commands:

```bash
cp .env.example .env
docker compose -f compose.yaml -f compose.demo.yaml up --build -d
docker compose -f compose.yaml -f compose.demo.yaml ps
docker compose -f compose.yaml -f compose.demo.yaml logs app
docker compose -f compose.yaml -f compose.demo.yaml down
```

State prominently that Plan 1 is unauthenticated, loopback-only, and not suitable for shared deployment.

- [ ] **Step 5: Run full backend and frontend verification**

Run:

```bash
./backend/mvnw -f backend/pom.xml verify
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

Expected: every unit, integration, component, and build check passes.

- [ ] **Step 6: Build the demo and verify health**

Run the Compose demo, then:

```bash
curl --fail http://127.0.0.1:8080/actuator/health/readiness
curl --fail http://127.0.0.1:8080/api/v1/system/info
```

Expected: both return HTTP 200; readiness is `UP` and product name is `DisputeCopilot`.

- [ ] **Step 7: Run Playwright end to end**

Run: `npm --prefix frontend exec playwright test`

Expected: the seeded order journey passes with no console errors or failed network requests.

- [ ] **Step 8: Verify privacy and persistence properties**

Run these manual assertions and record results in the commit message body or review notes:

1. Neither database port appears in `docker compose ... ps` published ports.
2. Invalid order ID produces `ORDER_NOT_FOUND` without exposing SQL or credentials.
3. Repeating the same POST idempotency key produces one case.
4. Restarting only `app` preserves and displays the case.
5. The merchant reader cannot insert, update, or delete.
6. The UI contains no recommendation, RAG citation, or approval action yet.

- [ ] **Step 9: Commit the working vertical slice**

```bash
git add Dockerfile compose.yaml compose.demo.yaml README.md docs/deployment-runbook.md frontend
git commit -m "feat: deliver case intake vertical slice"
```

## Plan 1 completion gate

Do not begin identity or RAG work until a reviewer can demonstrate all of the following from a clean clone:

- The demo starts with one documented Compose command.
- The React application loads from Spring Boot at `http://127.0.0.1:8080`.
- `ORD-2026-1042` becomes one persisted case with a source snapshot.
- The connector test proves the service identity cannot modify merchant data.
- A duplicate idempotency key cannot create a duplicate case.
- Restarting the application does not lose the case or workflow state.
- All tests and builds pass.
- The deployment remains loopback-only until Plan 2 adds authentication.

Only then write and execute Plan 2: Identity and Secure Setup.
