package com.disputecopilot.casework.api;

import com.disputecopilot.casework.api.ReportDtos.DraftReport;
import com.disputecopilot.casework.service.ReportService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cases/{caseId}/report")
public class ReportController {

  private final ReportService reportService;

  public ReportController(ReportService reportService) {
    this.reportService = reportService;
  }

  @GetMapping
  public DraftReport get(@PathVariable String caseId) {
    return reportService.get(caseId);
  }

  @PostMapping("/approve")
  public DraftReport approve(@PathVariable String caseId) {
    return reportService.approve(caseId);
  }

  @PostMapping("/request-changes")
  public DraftReport requestChanges(@PathVariable String caseId, @RequestBody(required = false) Map<String, String> body) {
    return reportService.requestChanges(caseId, body == null ? null : body.get("note"));
  }
}
