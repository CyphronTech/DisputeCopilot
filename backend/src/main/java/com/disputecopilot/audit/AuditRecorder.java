package com.disputecopilot.audit;

import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AuditRecorder {

  private final AuditEventJpaRepository repository;

  public AuditRecorder(AuditEventJpaRepository repository) {
    this.repository = repository;
  }

  public void record(String title, String detail, String orderId, String actorName, boolean actorIsSystem, String icon, String tone) {
    repository.save(new AuditEventEntity(UUID.randomUUID(), title, detail, orderId, actorName, actorIsSystem, icon, tone, Instant.now()));
  }
}
