package com.disputecopilot.casework.api;

import java.util.List;

public final class ReportDtos {
  private ReportDtos() {}

  public record EvidenceIndexEntry(String text, String sourceRef) {}

  public record DraftReport(
      String caseId, String orderId, int revision, boolean approved,
      String caseSummary, List<EvidenceIndexEntry> evidenceIndex,
      String policyCitationsSummary, String limitations,
      String recommendation, Double confidence, String policyVersion,
      String model, String contentHash) {}
}
