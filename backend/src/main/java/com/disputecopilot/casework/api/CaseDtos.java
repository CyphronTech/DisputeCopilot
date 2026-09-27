package com.disputecopilot.casework.api;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;

public final class CaseDtos {
  private CaseDtos() {}

  // 64 matches case_record.order_id's column width (see V1 migration) — a longer value would
  // fail the insert with a raw DB error instead of a message the merchant can act on.
  public record CreateCaseRequest(@NotBlank @jakarta.validation.constraints.Size(max = 64) String orderId) {}

  public record ManualResolutionRequest(@NotBlank String recommendation, String note) {}

  public record CaseSummary(
      String caseId, String orderId, String customerName, String customerEmail,
      String state, String recommendation, Double confidence, String summary, Instant createdAt) {}

  public record EvidenceItem(String observedAt, String title, String description, String sourceRef, String kind, String attachmentUrl) {}

  public record PolicyCitation(String documentId, String title, String version, int page, String quote) {}

  public record CaseDetail(
      String caseId, String orderId, String customerName, String state,
      List<EvidenceItem> evidence, List<PolicyCitation> citations,
      String recommendation, Double confidence, String caveat, String summary) {}

  public record CaseMetrics(long openCases, long awaitingApproval, long manualReview, long reportsDownloaded) {}
}
