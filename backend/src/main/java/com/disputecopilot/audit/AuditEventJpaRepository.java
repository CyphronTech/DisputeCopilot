package com.disputecopilot.audit;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventJpaRepository extends JpaRepository<AuditEventEntity, UUID> {
  List<AuditEventEntity> findAllByOrderByOccurredAtDesc();
}
