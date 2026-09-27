package com.disputecopilot.casework.service;

import com.disputecopilot.audit.AuditRecorder;
import com.disputecopilot.casework.api.ReportDtos.DraftReport;
import com.disputecopilot.casework.api.ReportDtos.EvidenceIndexEntry;
import com.disputecopilot.casework.domain.CaseState;
import com.disputecopilot.casework.persistence.CaseCitationEntity;
import com.disputecopilot.casework.persistence.CaseCitationJpaRepository;
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
  private final CaseCitationJpaRepository citations;

  public ReportService(CaseJpaRepository cases, EvidenceItemJpaRepository evidenceItems, ModelConfigJpaRepository modelConfigs, AuditRecorder audit, CaseCitationJpaRepository citations) {
    this.cases = cases;
    this.evidenceItems = evidenceItems;
    this.modelConfigs = modelConfigs;
    this.audit = audit;
    this.citations = citations;
  }

  public DraftReport get(String caseId) {
    CaseEntity entity = cases.findById(UUID.fromString(caseId)).orElseThrow(() -> new NoSuchElementException("Case not found"));
    List<EvidenceItemEntity> items = evidenceItems.findByCaseId(entity.getId());
    return build(entity, items);
  }

  @Transactional
  public DraftReport approve(String caseId) {
    CaseEntity entity = cases.findById(UUID.fromString(caseId)).orElseThrow(() -> new NoSuchElementException("Case not found"));
    if (entity.getRecommendation() == null) {
      // Nothing was ever decided for this case (the AI review failed, or no order was found),
      // so there is no recommendation to approve — approving would export a report whose
      // headline decision is blank.
      throw new IllegalArgumentException("This case has no recommendation yet — resolve it manually before approving.");
    }
    entity.setState(CaseState.APPROVED);
    cases.save(entity);
    audit.record("Report approved", "recommendation " + entity.getRecommendation(), entity.getOrderId(), "Admin", false, "check", "success");
    return build(entity, evidenceItems.findByCaseId(entity.getId()));
  }

  @Transactional
  public DraftReport requestChanges(String caseId, String note) {
    CaseEntity entity = cases.findById(UUID.fromString(caseId)).orElseThrow(() -> new NoSuchElementException("Case not found"));
    entity.applyReview(entity.getRecommendation(), entity.getConfidence(), note, entity.getSummary(), CaseState.MANUAL_REVIEW_REQUIRED);
    cases.save(entity);
    audit.record("Report sent back for changes", note == null || note.isBlank() ? "no note provided" : note, entity.getOrderId(), "Admin", false, "alert", "warn");
    return build(entity, evidenceItems.findByCaseId(entity.getId()));
  }

  private DraftReport build(CaseEntity entity, List<EvidenceItemEntity> items) {
    List<EvidenceIndexEntry> index = items.stream()
        .map(i -> new EvidenceIndexEntry(i.getTitle() + ": " + i.getDescription(), i.getSourceRef()))
        .toList();
    String caseSummary = entity.getSummary() != null ? entity.getSummary()
        : "No plain-English summary was generated for this older case. Order " + entity.getOrderId() + " for " + entity.getCustomerName() + "."
        + (entity.getCaveat() == null ? "" : " " + entity.getCaveat());
    String model = modelConfigs.findById(Boolean.TRUE).map(c -> c.getProvider() + "/" + c.getModel()).orElse("not configured");
    boolean approved = entity.getState() == CaseState.APPROVED || entity.getState() == CaseState.EXPORTED;

    List<CaseCitationEntity> caseCitations = citations.findByCaseId(entity.getId());
    String policyCitationsSummary = caseCitations.isEmpty()
        ? "No matching policy was found for this case — the recommendation is based on your records alone, not a specific policy rule."
        : caseCitations.stream()
            .map(c -> c.getTitle() + " v" + c.getVersion() + ": \"" + c.getQuote() + "\"")
            .reduce((a, b) -> a + "\n" + b).orElse("");
    String policyVersion = caseCitations.isEmpty() ? "No policy matched" : caseCitations.get(0).getVersion();

    // Hash everything the report actually asserts. Hashing only the id/recommendation/evidence
    // index would leave the summary and policy quotes — the parts a reader relies on — outside
    // the thing the hash claims to attest to.
    String content = String.join("|", entity.getId().toString(), String.valueOf(entity.getRecommendation()),
        String.valueOf(entity.getConfidence()), caseSummary, policyCitationsSummary, index.toString());
    return new DraftReport(
        entity.getId().toString(), entity.getOrderId(), 1, approved, caseSummary, index,
        policyCitationsSummary,
        "This was generated from your store's own records only; no one has manually double-checked it against the physical order yet.",
        entity.getRecommendation(), entity.getConfidence(), policyVersion, model, sha256(content));
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
