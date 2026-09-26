package com.disputecopilot.policy;

import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/policies")
public class PolicyController {

  private final PolicyDocumentJpaRepository repository;

  public PolicyController(PolicyDocumentJpaRepository repository) {
    this.repository = repository;
  }

  public record VersionView(String version, String status, LocalDate effectiveFrom, LocalDate effectiveTo) {}
  public record PolicyDocumentView(
      String documentId, String title, String filename, String version, String status,
      LocalDate effectiveFrom, LocalDate effectiveTo, List<VersionView> versions) {}

  @GetMapping
  public List<PolicyDocumentView> list() {
    return repository.findAll().stream().map(this::toView).toList();
  }

  private PolicyDocumentView toView(PolicyDocumentEntity e) {
    VersionView version = new VersionView(e.getVersion(), e.getStatus(), e.getEffectiveFrom(), e.getEffectiveTo());
    return new PolicyDocumentView(e.getId().toString(), e.getTitle(), e.getFilename(), e.getVersion(), e.getStatus(), e.getEffectiveFrom(), e.getEffectiveTo(), List.of(version));
  }
}
