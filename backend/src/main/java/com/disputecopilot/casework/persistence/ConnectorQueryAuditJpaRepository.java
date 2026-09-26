package com.disputecopilot.casework.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConnectorQueryAuditJpaRepository extends JpaRepository<ConnectorQueryAuditEntity, UUID> {}
