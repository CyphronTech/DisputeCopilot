package com.disputecopilot.casework.api;

import com.disputecopilot.casework.api.CaseDtos.CaseDetail;
import com.disputecopilot.casework.api.CaseDtos.CaseMetrics;
import com.disputecopilot.casework.api.CaseDtos.CaseSummary;
import com.disputecopilot.casework.api.CaseDtos.CreateCaseRequest;
import com.disputecopilot.casework.api.CaseDtos.ManualResolutionRequest;
import com.disputecopilot.casework.domain.CaseState;
import com.disputecopilot.casework.service.CaseIntakeService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cases")
public class CaseController {

  private final CaseIntakeService caseIntakeService;

  public CaseController(CaseIntakeService caseIntakeService) {
    this.caseIntakeService = caseIntakeService;
  }

  @PostMapping
  public CaseDetail create(@Valid @RequestBody CreateCaseRequest request) {
    return caseIntakeService.create(request.orderId());
  }

  @GetMapping
  public List<CaseSummary> list() {
    return caseIntakeService.list();
  }

  @GetMapping("/{caseId}")
  public CaseDetail get(@PathVariable String caseId) {
    return caseIntakeService.get(caseId);
  }

  @PostMapping("/{caseId}/manual-resolution")
  public CaseDetail resolveManually(@PathVariable String caseId, @Valid @RequestBody ManualResolutionRequest request) {
    return caseIntakeService.resolveManually(caseId, request.recommendation(), request.note());
  }

  @GetMapping("/metrics")
  public CaseMetrics metrics() {
    List<CaseSummary> all = caseIntakeService.list();
    long awaiting = all.stream().filter(c -> c.state().equals(CaseState.AWAITING_HUMAN_APPROVAL.name())).count();
    long manualReview = all.stream().filter(c -> c.state().equals(CaseState.MANUAL_REVIEW_REQUIRED.name())).count();
    return new CaseMetrics(all.size(), awaiting, manualReview, 0.0);
  }
}
