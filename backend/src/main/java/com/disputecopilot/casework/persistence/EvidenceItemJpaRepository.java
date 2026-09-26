package com.disputecopilot.casework.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EvidenceItemJpaRepository extends JpaRepository<EvidenceItemEntity, UUID> {
  List<EvidenceItemEntity> findByCaseId(UUID caseId);
}
