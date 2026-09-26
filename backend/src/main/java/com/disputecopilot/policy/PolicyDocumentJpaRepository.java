package com.disputecopilot.policy;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyDocumentJpaRepository extends JpaRepository<PolicyDocumentEntity, UUID> {
  List<PolicyDocumentEntity> findAllByStatus(String status);
}
