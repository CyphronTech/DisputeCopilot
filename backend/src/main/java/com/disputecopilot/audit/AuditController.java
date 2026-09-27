package com.disputecopilot.audit;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

  private final AuditEventJpaRepository repository;

  public AuditController(AuditEventJpaRepository repository) {
    this.repository = repository;
  }

  public record AuditEventView(
      String id, String title, String detail, String caseOrderId, String actorName,
      String actorInitials, boolean actorIsSystem, String icon, String tone, Instant timestamp) {}

  @GetMapping
  public List<AuditEventView> list() {
    return repository.findAllByOrderByOccurredAtDesc().stream().map(this::toView).toList();
  }

  private AuditEventView toView(AuditEventEntity e) {
    return new AuditEventView(
        e.getId().toString(), e.getTitle(), e.getDetail(), e.getOrderId(), e.getActorName(),
        initials(e.getActorName()), e.isActorIsSystem(), e.getIcon(), e.getTone(), e.getOccurredAt());
  }

  private String initials(String name) {
    // Defensive: every current caller of AuditRecorder.record passes a non-blank actor name, but
    // actor_name is free-form text, not something this controller controls — a blank one must
    // render as "no initials", not break the whole audit log with an exception.
    if (name == null || name.isBlank()) return "";
    String[] parts = name.trim().split("\\s+");
    String first = parts[0].substring(0, 1);
    String last = parts.length > 1 ? parts[parts.length - 1].substring(0, 1) : "";
    return (first + last).toUpperCase(Locale.ROOT);
  }
}
