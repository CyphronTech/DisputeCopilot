package com.disputecopilot.casework.persistence;

import com.disputecopilot.casework.domain.CaseState;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaseJpaRepository extends JpaRepository<CaseEntity, UUID> {
  Optional<CaseEntity> findByOrderIdAndStateNotIn(String orderId, List<CaseState> excluded);
}
