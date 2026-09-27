package com.disputecopilot.casework.service;

import com.disputecopilot.casework.api.CaseDtos.CaseDetail;
import com.disputecopilot.casework.api.CaseDtos.CaseSummary;
import com.disputecopilot.casework.api.CaseDtos.EvidenceItem;
import com.disputecopilot.casework.api.CaseDtos.PolicyCitation;
import com.disputecopilot.casework.domain.CaseState;
import com.disputecopilot.casework.persistence.CaseCitationEntity;
import com.disputecopilot.casework.persistence.CaseCitationJpaRepository;
import com.disputecopilot.casework.persistence.CaseEntity;
import com.disputecopilot.casework.persistence.CaseJpaRepository;
import com.disputecopilot.casework.persistence.ConnectorQueryAuditEntity;
import com.disputecopilot.casework.persistence.ConnectorQueryAuditJpaRepository;
import com.disputecopilot.casework.persistence.EvidenceItemEntity;
import com.disputecopilot.casework.persistence.EvidenceItemJpaRepository;
import com.disputecopilot.connector.MerchantConnectorRouter;
import com.disputecopilot.connector.TableRoleMappingStore;
import com.disputecopilot.agent.EvidenceReviewAgent;
import com.disputecopilot.audit.AuditRecorder;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CaseIntakeService {

  private static final List<CaseState> TERMINAL = List.of(CaseState.EXPORTED, CaseState.FAILED);

  private final CaseJpaRepository cases;
  private final EvidenceItemJpaRepository evidenceItems;
  private final ConnectorQueryAuditJpaRepository queryAudit;
  private final MerchantConnectorRouter connector;
  private final EvidenceReviewAgent reviewAgent;
  private final AuditRecorder audit;
  private final CaseCitationJpaRepository citations;
  private final TableRoleMappingStore roleMapping;

  public CaseIntakeService(
      CaseJpaRepository cases,
      EvidenceItemJpaRepository evidenceItems,
      ConnectorQueryAuditJpaRepository queryAudit,
      MerchantConnectorRouter connector,
      EvidenceReviewAgent reviewAgent,
      AuditRecorder audit,
      CaseCitationJpaRepository citations,
      TableRoleMappingStore roleMapping) {
    this.cases = cases;
    this.evidenceItems = evidenceItems;
    this.queryAudit = queryAudit;
    this.connector = connector;
    this.reviewAgent = reviewAgent;
    this.audit = audit;
    this.citations = citations;
    this.roleMapping = roleMapping;
  }

  @Transactional
  public CaseDetail create(String orderId) {
    return cases.findByOrderIdAndStateNotIn(orderId, TERMINAL)
        .map(existing -> toDetail(existing, evidenceItems.findByCaseId(existing.getId())))
        .orElseGet(() -> collectEvidence(newCase(orderId)));
  }

  private CaseEntity newCase(String orderId) {
    List<Map<String, Object>> orderRows = connector.readApprovedTable("orders", orderId);
    TableRoleMappingStore.RoleMapping ordersMapping = roleMapping.load().get("orders");
    String nameColumn = ordersMapping != null && ordersMapping.customerNameColumn() != null ? ordersMapping.customerNameColumn() : "customer_name";
    String emailColumn = ordersMapping != null && ordersMapping.customerEmailColumn() != null ? ordersMapping.customerEmailColumn() : "customer_email";
    // A normalized schema often keeps the customer in its own table, so the orders row has no
    // name/email column at all. Reading a missing key would otherwise render the literal text
    // "null" as the customer's name throughout the UI and the exported report.
    String customerName = firstNonBlank(orderRows, nameColumn, "Unknown customer");
    String customerEmail = firstNonBlank(orderRows, emailColumn, "Unknown email");
    CaseEntity entity = new CaseEntity(UUID.randomUUID(), orderId, customerName, customerEmail, CaseState.FETCHING_DATA, Instant.now());
    audit.record("Case opened", "investigation started", orderId, "System", true, "setup", "neutral");
    return cases.save(entity);
  }

  private String firstNonBlank(List<Map<String, Object>> rows, String column, String fallback) {
    if (rows.isEmpty()) return fallback;
    Object value = rows.get(0).get(column);
    return value == null || String.valueOf(value).isBlank() ? fallback : String.valueOf(value);
  }

  private CaseDetail collectEvidence(CaseEntity caseEntity) {
    boolean orderFound = false;
    boolean refundIssued = false;
    List<String> roles = connector.approvedTables();
    TableRoleMappingStore.RoleMapping refundsMapping = roleMapping.load().get("refunds");
    for (String table : roles) {
      List<Map<String, Object>> rows = connector.readApprovedTable(table, caseEntity.getOrderId());
      queryAudit.save(new ConnectorQueryAuditEntity(UUID.randomUUID(), caseEntity.getId(), table, rows.size(), Instant.now()));
      evidenceItems.save(toEvidenceItem(caseEntity.getId(), table, rows));
      if (table.equals("orders") && !rows.isEmpty()) orderFound = true;
      if (table.equals("refunds") && rows.stream().anyMatch(row -> looksIssued(row, refundsMapping))) refundIssued = true;
    }
    audit.record("Merchant DB evidence collected", roles.size() + " tables queried", caseEntity.getOrderId(), "System", true, "db", "accent");
    List<EvidenceItemEntity> evidence = evidenceItems.findByCaseId(caseEntity.getId());

    if (!orderFound) {
      // Nothing to reason about — asking the model to guess about an order it has no data for is exactly how hallucination happens.
      caseEntity.applyReview(null, null, "No order matching '" + caseEntity.getOrderId() + "' was found in your store.",
          "We couldn't find an order matching '" + caseEntity.getOrderId() + "' in your store — check the order ID and try again.",
          CaseState.MANUAL_REVIEW_REQUIRED);
      audit.record("Order not found", "no orders record for " + caseEntity.getOrderId(), caseEntity.getOrderId(), "System", true, "alert", "warn");
      cases.save(caseEntity);
      return toDetail(caseEntity, evidence);
    }

    try {
      EvidenceReviewAgent.Review review = reviewAgent.review(caseEntity.getOrderId(), evidence);
      String recommendation = review.recommendation();
      double confidence = review.confidence();
      String caveat = review.caveat();

      // Deterministic safety net: our own prompt ties ACCEPT to "a refund was already issued" and
      // CONTEST to "no refund was issued" — if the model's answer contradicts what the connector
      // actually read, trust the data over the model and force a human to look, rather than act on
      // a recommendation that's inconsistent with the merchant's own records.
      if (recommendation.equals("CONTEST") && refundIssued) {
        caveat = "Flagged for you: the AI recommended contesting, but your records show a refund was already issued for this order.";
        recommendation = "MANUAL_REVIEW_REQUIRED";
        confidence = 0.0;
      } else if (recommendation.equals("ACCEPT") && !refundIssued) {
        caveat = "Flagged for you: the AI recommended accepting, but there's no refund on record for this order yet.";
        recommendation = "MANUAL_REVIEW_REQUIRED";
        confidence = 0.0;
      }

      CaseState nextState = recommendation.equals("MANUAL_REVIEW_REQUIRED")
          ? CaseState.MANUAL_REVIEW_REQUIRED : CaseState.AWAITING_HUMAN_APPROVAL;

      // Deterministic refund line — computed from the connector's own read of the refunds table,
      // not left to how the model happens to phrase its summary, so the merchant always sees an
      // unambiguous answer to "should I refund this" regardless of prose quality.
      String refundNote = refundIssued
          ? "A refund has already been issued for this order — no further refund is needed."
          : recommendation.equals("CONTEST")
              ? "No refund is on record — since you're contesting, do not refund the customer."
              : "No refund is on record — hold off on refunding until this case is resolved.";
      caveat = caveat == null ? refundNote : caveat + " " + refundNote;

      caseEntity.applyReview(recommendation, confidence, caveat, review.summary(), nextState);
      for (EvidenceReviewAgent.Citation citation : review.citations()) {
        citations.save(new CaseCitationEntity(UUID.randomUUID(), caseEntity.getId(), UUID.fromString(citation.documentId()), citation.title(), citation.version(), citation.quote()));
      }
      if (nextState == CaseState.MANUAL_REVIEW_REQUIRED) {
        audit.record("Routed to manual review", caveat == null ? "agent could not reach a confident recommendation" : caveat, caseEntity.getOrderId(), "System", true, "alert", "warn");
      } else {
        audit.record("Agent recommendation ready", recommendation + " · confidence " + confidence, caseEntity.getOrderId(), "System", true, "check", "success");
      }
    } catch (Exception e) {
      caseEntity.applyReview(null, null, "AI review unavailable: " + e.getMessage(), null, CaseState.MANUAL_REVIEW_REQUIRED);
      audit.record("AI review failed", e.getMessage(), caseEntity.getOrderId(), "System", true, "alert", "warn");
    }
    cases.save(caseEntity);
    return toDetail(caseEntity, evidence);
  }

  private boolean looksIssued(Map<String, Object> refundRow, TableRoleMappingStore.RoleMapping refundsMapping) {
    String statusColumn = refundsMapping != null && refundsMapping.statusColumn() != null ? refundsMapping.statusColumn() : "status";
    String issuedValue = refundsMapping != null && refundsMapping.issuedValue() != null ? refundsMapping.issuedValue() : "issued";
    Object status = refundRow.get(statusColumn);
    return status != null && String.valueOf(status).trim().equalsIgnoreCase(issuedValue);
  }

  private EvidenceItemEntity toEvidenceItem(UUID caseId, String table, List<Map<String, Object>> rows) {
    if (rows.isEmpty()) {
      return new EvidenceItemEntity(UUID.randomUUID(), caseId, "gap", table + " missing", "No " + table + " record found for this order", "gap · " + table, null);
    }
    Map<String, Object> row = rows.get(0);
    String kind = table.equals("communications") ? "communication" : "ok";
    String attachmentUrl = row.entrySet().stream()
        .filter(e -> e.getKey().toLowerCase().contains("url") && e.getValue() != null)
        .map(e -> String.valueOf(e.getValue()))
        .findFirst().orElse(null);
    return new EvidenceItemEntity(UUID.randomUUID(), caseId, kind, table, describe(row), table + "." + row.keySet().iterator().next(), observedAt(row), attachmentUrl);
  }

  /**
   * The timeline needs a date per evidence item, but which column carries it differs per
   * merchant schema (created_at, shipped_at, occurred_at, requested_on...). Picking the first
   * date-ish column beats leaving every item undated, and an unrecognised schema just falls
   * back to no date rather than guessing wrong.
   */
  private String observedAt(Map<String, Object> row) {
    return row.entrySet().stream()
        .filter(e -> e.getValue() != null && e.getKey().toLowerCase().matches(".*(_at|_on|date|timestamp).*"))
        .map(e -> String.valueOf(e.getValue()))
        .findFirst().orElse(null);
  }

  private String describe(Map<String, Object> row) {
    return row.entrySet().stream()
        .filter(e -> !e.getKey().toLowerCase().contains("url"))
        .map(e -> humanizeKey(e.getKey()) + ": " + e.getValue())
        .reduce((a, b) -> a + " · " + b).orElse("");
  }

  /** "processor_ref" -> "Processor ref" — generic so it works for any merchant's own column names, not just the fixture schema. */
  private String humanizeKey(String key) {
    String spaced = key.replace('_', ' ');
    return Character.toUpperCase(spaced.charAt(0)) + spaced.substring(1);
  }

  public CaseDetail get(String caseId) {
    CaseEntity entity = cases.findById(UUID.fromString(caseId)).orElseThrow(() -> new NoSuchElementException("Case not found"));
    return toDetail(entity, evidenceItems.findByCaseId(entity.getId()));
  }

  @Transactional
  public CaseDetail resolveManually(String caseId, String recommendation, String note) {
    if (!recommendation.equals("CONTEST") && !recommendation.equals("ACCEPT")) {
      throw new IllegalArgumentException("recommendation must be CONTEST or ACCEPT");
    }
    CaseEntity entity = cases.findById(UUID.fromString(caseId)).orElseThrow(() -> new NoSuchElementException("Case not found"));
    String summary = "An analyst reviewed order " + entity.getOrderId() + " by hand and decided to "
        + (recommendation.equals("CONTEST") ? "contest" : "accept") + " the dispute"
        + (note == null || note.isBlank() ? "." : ", noting: " + note);
    entity.applyReview(recommendation, 1.0, note, summary, CaseState.AWAITING_HUMAN_APPROVAL);
    cases.save(entity);
    audit.record("Case resolved manually", recommendation + (note == null || note.isBlank() ? "" : " — " + note), entity.getOrderId(), "Admin", false, "user", "neutral");
    return toDetail(entity, evidenceItems.findByCaseId(entity.getId()));
  }

  private List<PolicyCitation> toCitations(UUID caseId) {
    return citations.findByCaseId(caseId).stream()
        .map(c -> new PolicyCitation(c.getDocumentId().toString(), c.getTitle(), c.getVersion(), 1, c.getQuote()))
        .toList();
  }

  public List<CaseSummary> list() {
    return cases.findAll().stream().map(this::toSummary).toList();
  }

  private CaseSummary toSummary(CaseEntity e) {
    return new CaseSummary(e.getId().toString(), e.getOrderId(), e.getCustomerName(), e.getCustomerEmail(), e.getState().name(), e.getRecommendation(), e.getConfidence(), e.getSummary(), e.getCreatedAt());
  }

  private CaseDetail toDetail(CaseEntity e, List<EvidenceItemEntity> items) {
    List<EvidenceItem> evidence = items.stream()
        .map(i -> new EvidenceItem(i.getObservedAt(), i.getTitle(), i.getDescription(), i.getSourceRef(), i.getKind(), i.getAttachmentUrl()))
        .toList();
    return new CaseDetail(e.getId().toString(), e.getOrderId(), e.getCustomerName(), e.getState().name(), evidence, toCitations(e.getId()), e.getRecommendation(), e.getConfidence(), e.getCaveat(), e.getSummary());
  }
}
