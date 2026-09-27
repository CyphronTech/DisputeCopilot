package com.disputecopilot.casework.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.disputecopilot.agent.EvidenceReviewAgent;
import com.disputecopilot.audit.AuditRecorder;
import com.disputecopilot.casework.persistence.CaseCitationJpaRepository;
import com.disputecopilot.casework.persistence.CaseJpaRepository;
import com.disputecopilot.casework.persistence.ConnectorQueryAuditJpaRepository;
import com.disputecopilot.casework.persistence.EvidenceItemJpaRepository;
import com.disputecopilot.connector.MerchantConnectorRouter;
import com.disputecopilot.connector.TableRoleMappingStore;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** The paths that used to leave an order stuck forever, or let the review miss a refund. */
class CaseIntakeServiceTest {

  private final CaseJpaRepository cases = mock(CaseJpaRepository.class);
  private final EvidenceItemJpaRepository evidence = mock(EvidenceItemJpaRepository.class);
  private final MerchantConnectorRouter connector = mock(MerchantConnectorRouter.class);
  private final EvidenceReviewAgent agent = mock(EvidenceReviewAgent.class);
  private final TableRoleMappingStore roleMapping = mock(TableRoleMappingStore.class);
  private CaseIntakeService service;

  @BeforeEach
  void setUp() {
    service = new CaseIntakeService(cases, evidence, mock(ConnectorQueryAuditJpaRepository.class), connector, agent,
        mock(AuditRecorder.class), mock(CaseCitationJpaRepository.class), roleMapping);
    when(cases.findByOrderIdAndStateNotIn(anyString(), any())).thenReturn(Optional.empty());
    when(cases.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(evidence.findByCaseId(any())).thenReturn(List.of());
    when(roleMapping.load()).thenReturn(Map.of());
  }

  @Test
  void orderNotFoundSavesNothingSoTheIdStaysFree() {
    when(connector.readApprovedTable("orders", "42")).thenReturn(List.of());
    assertThrows(NoSuchElementException.class, () -> service.create("42"));
    verify(cases, never()).save(any());
  }

  @Test
  void aiFailureEndsFailedWhichFreesTheOrderForARetry() {
    when(connector.readApprovedTable(eq("orders"), anyString())).thenReturn(List.of(Map.of("order_id", "7")));
    when(connector.approvedTables()).thenReturn(List.of("orders"));
    when(agent.review(anyString(), any())).thenThrow(new IllegalStateException("Your AI provider rejected the API key."));
    assertEquals("FAILED", service.create("7").state());
  }

  @Test
  void anIssuedRefundInTheSecondRowStillStopsAContestRecommendation() {
    when(connector.readApprovedTable(eq("orders"), anyString())).thenReturn(List.of(Map.of("order_id", "9")));
    when(connector.readApprovedTable(eq("refunds"), anyString())).thenReturn(List.of(
        Map.of("order_id", "9", "status", "failed"),
        Map.of("order_id", "9", "status", "issued")));
    when(connector.approvedTables()).thenReturn(List.of("orders", "refunds"));
    when(agent.review(anyString(), any())).thenReturn(new EvidenceReviewAgent.Review("CONTEST", 0.9, null, "s", List.of()));

    var detail = service.create("9");

    assertEquals("MANUAL_REVIEW_REQUIRED", detail.recommendation());
  }
}
