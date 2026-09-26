package com.disputecopilot.casework.service;

import com.disputecopilot.casework.api.CaseDtos.CaseDetail;
import com.disputecopilot.casework.api.CaseDtos.CaseSummary;
import com.disputecopilot.casework.api.CaseDtos.EvidenceItem;
import com.disputecopilot.casework.domain.CaseState;
import com.disputecopilot.casework.persistence.CaseEntity;
import com.disputecopilot.casework.persistence.CaseJpaRepository;
import com.disputecopilot.casework.persistence.ConnectorQueryAuditEntity;
import com.disputecopilot.casework.persistence.ConnectorQueryAuditJpaRepository;
import com.disputecopilot.casework.persistence.EvidenceItemEntity;
import com.disputecopilot.casework.persistence.EvidenceItemJpaRepository;
import com.disputecopilot.connector.MerchantConnector;
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
  private final MerchantConnector connector;
  private final EvidenceReviewAgent reviewAgent;
  private final AuditRecorder audit;

  public CaseIntakeService(
      CaseJpaRepository cases,
      EvidenceItemJpaRepository evidenceItems,
      ConnectorQueryAuditJpaRepository queryAudit,
      MerchantConnector connector,
      EvidenceReviewAgent reviewAgent,
      AuditRecorder audit) {
    this.cases = cases;
    this.evidenceItems = evidenceItems;
    this.queryAudit = queryAudit;
    this.connector = connector;
    this.reviewAgent = reviewAgent;
    this.audit = audit;
  }

  @Transactional
  public CaseDetail create(String orderId) {
    return cases.findByOrderIdAndStateNotIn(orderId, TERMINAL)
        .map(existing -> toDetail(existing, evidenceItems.findByCaseId(existing.getId())))
        .orElseGet(() -> collectEvidence(newCase(orderId)));
  }

  private CaseEntity newCase(String orderId) {
    // ponytail: customer name/email would come from the connector's orders/customers
    // read too; hardcoded here because the fixture DB doesn't have a customers table yet.
    CaseEntity entity = new CaseEntity(UUID.randomUUID(), orderId, "Priya Nair", "priya.nair@mail.com", CaseState.FETCHING_DATA, Instant.now());
    audit.record("Case opened", "investigation started", orderId, "System", true, "setup", "neutral");
    return cases.save(entity);
  }

  private CaseDetail collectEvidence(CaseEntity caseEntity) {
    for (String table : connector.approvedTables()) {
      List<Map<String, Object>> rows = connector.readApprovedTable(table, caseEntity.getOrderId());
      queryAudit.save(new ConnectorQueryAuditEntity(UUID.randomUUID(), caseEntity.getId(), table, rows.size(), Instant.now()));
      evidenceItems.save(toEvidenceItem(caseEntity.getId(), table, rows));
    }
    audit.record("Merchant DB evidence collected", connector.approvedTables().size() + " tables queried", caseEntity.getOrderId(), "System", true, "db", "accent");
    List<EvidenceItemEntity> evidence = evidenceItems.findByCaseId(caseEntity.getId());
    try {
      EvidenceReviewAgent.Review review = reviewAgent.review(caseEntity.getOrderId(), evidence);
      CaseState nextState = review.recommendation().equals("MANUAL_REVIEW_REQUIRED")
          ? CaseState.MANUAL_REVIEW_REQUIRED : CaseState.AWAITING_HUMAN_APPROVAL;
      caseEntity.applyReview(review.recommendation(), review.confidence(), review.caveat(), nextState);
      if (nextState == CaseState.MANUAL_REVIEW_REQUIRED) {
        audit.record("Routed to manual review", review.caveat() == null ? "agent could not reach a confident recommendation" : review.caveat(), caseEntity.getOrderId(), "System", true, "alert", "warn");
      } else {
        audit.record("Agent recommendation ready", review.recommendation() + " · confidence " + review.confidence(), caseEntity.getOrderId(), "System", true, "check", "success");
      }
    } catch (Exception e) {
      caseEntity.applyReview(null, null, "AI review unavailable: " + e.getMessage(), CaseState.MANUAL_REVIEW_REQUIRED);
      audit.record("AI review failed", e.getMessage(), caseEntity.getOrderId(), "System", true, "alert", "warn");
    }
    cases.save(caseEntity);
    return toDetail(caseEntity, evidence);
  }

  private EvidenceItemEntity toEvidenceItem(UUID caseId, String table, List<Map<String, Object>> rows) {
    if (rows.isEmpty()) {
      return new EvidenceItemEntity(UUID.randomUUID(), caseId, "gap", table + " missing", "No " + table + " record found for this order", "gap · " + table, null);
    }
    Map<String, Object> row = rows.get(0);
    String kind = table.equals("communications") ? "communication" : "ok";
    return new EvidenceItemEntity(UUID.randomUUID(), caseId, kind, table, describe(row), table + "." + row.keySet().iterator().next(), null);
  }

  private String describe(Map<String, Object> row) {
    return row.entrySet().stream().map(e -> e.getKey() + "=" + e.getValue()).reduce((a, b) -> a + ", " + b).orElse("");
  }

  public CaseDetail get(String caseId) {
    CaseEntity entity = cases.findById(UUID.fromString(caseId)).orElseThrow(NoSuchElementException::new);
    return toDetail(entity, evidenceItems.findByCaseId(entity.getId()));
  }

  public List<CaseSummary> list() {
    return cases.findAll().stream().map(this::toSummary).toList();
  }

  private CaseSummary toSummary(CaseEntity e) {
    return new CaseSummary(e.getId().toString(), e.getOrderId(), e.getCustomerName(), e.getCustomerEmail(), e.getState().name(), e.getRecommendation(), e.getConfidence(), e.getCreatedAt());
  }

  private CaseDetail toDetail(CaseEntity e, List<EvidenceItemEntity> items) {
    List<EvidenceItem> evidence = items.stream()
        .map(i -> new EvidenceItem(i.getObservedAt(), i.getTitle(), i.getDescription(), i.getSourceRef(), i.getKind()))
        .toList();
    return new CaseDetail(e.getId().toString(), e.getOrderId(), e.getCustomerName(), e.getState().name(), evidence, List.of(), e.getRecommendation(), e.getConfidence(), e.getCaveat());
  }
}
