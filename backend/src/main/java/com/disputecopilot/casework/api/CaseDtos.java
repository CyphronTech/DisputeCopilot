package com.disputecopilot.casework.api;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;

public final class CaseDtos {
  private CaseDtos() {}

  public record CreateCaseRequest(@NotBlank String orderId) {}

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

  public record CaseMetrics(long openCases, long awaitingApproval, long manualReview, double exportedWithoutEditsPct) {}
}
