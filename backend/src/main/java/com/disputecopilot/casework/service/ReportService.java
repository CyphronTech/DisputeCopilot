package com.disputecopilot.casework.service;

import com.disputecopilot.audit.AuditRecorder;
import com.disputecopilot.casework.api.ReportDtos.DraftReport;
import com.disputecopilot.casework.api.ReportDtos.EvidenceIndexEntry;
import com.disputecopilot.casework.domain.CaseState;
import com.disputecopilot.casework.persistence.CaseEntity;
import com.disputecopilot.casework.persistence.CaseJpaRepository;
import com.disputecopilot.casework.persistence.EvidenceItemEntity;
import com.disputecopilot.casework.persistence.EvidenceItemJpaRepository;
import com.disputecopilot.setup.ModelConfigJpaRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Draft report is computed on the fly from case + evidence rather than persisted as its
 * own revisioned document — ponytail: add a report_revision table when editable multi-draft
 * history is actually needed, not before.
 */
@Service
public class ReportService {

  private final CaseJpaRepository cases;
  private final EvidenceItemJpaRepository evidenceItems;
  private final ModelConfigJpaRepository modelConfigs;
  private final AuditRecorder audit;

  public ReportService(CaseJpaRepository cases, EvidenceItemJpaRepository evidenceItems, ModelConfigJpaRepository modelConfigs, AuditRecorder audit) {
    this.cases = cases;
    this.evidenceItems = evidenceItems;
    this.modelConfigs = modelConfigs;
    this.audit = audit;
  }

  public DraftReport get(String caseId) {
    CaseEntity entity = cases.findById(UUID.fromString(caseId)).orElseThrow(NoSuchElementException::new);
    List<EvidenceItemEntity> items = evidenceItems.findByCaseId(entity.getId());
    return build(entity, items);
  }

  @Transactional
  public DraftReport approve(String caseId) {
    CaseEntity entity = cases.findById(UUID.fromString(caseId)).orElseThrow(NoSuchElementException::new);
    entity.setState(CaseState.APPROVED);
    cases.save(entity);
    audit.record("Report approved", "recommendation " + entity.getRecommendation(), entity.getOrderId(), "Admin", false, "check", "success");
    return build(entity, evidenceItems.findByCaseId(entity.getId()));
  }

  private DraftReport build(CaseEntity entity, List<EvidenceItemEntity> items) {
    List<EvidenceIndexEntry> index = items.stream()
        .map(i -> new EvidenceIndexEntry(i.getTitle() + ": " + i.getDescription(), i.getSourceRef()))
        .toList();
    String caseSummary = "Order " + entity.getOrderId() + " for " + entity.getCustomerName()
        + ". Recommendation: " + (entity.getRecommendation() == null ? "pending" : entity.getRecommendation())
        + (entity.getCaveat() == null ? "" : " (" + entity.getCaveat() + ")");
    String model = modelConfigs.findById(Boolean.TRUE).map(c -> c.getProvider() + "/" + c.getModel()).orElse("not configured");
    boolean approved = entity.getState() == CaseState.APPROVED || entity.getState() == CaseState.EXPORTED;
    String content = entity.getId() + "|" + entity.getRecommendation() + "|" + entity.getConfidence() + "|" + index;
    return new DraftReport(
        entity.getId().toString(), entity.getOrderId(), 1, approved, caseSummary, index,
        "No policy library is ingested yet — this recommendation is evidence-completeness only, not policy-grounded.",
        "Evidence was read only from the merchant's allowlisted tables listed in architecture.md; no manual verification has occurred.",
        entity.getRecommendation(), entity.getConfidence(), "N/A — no policy documents ingested", model, sha256(content));
  }

  private String sha256(String input) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
