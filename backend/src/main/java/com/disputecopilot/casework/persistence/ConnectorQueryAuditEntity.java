package com.disputecopilot.casework.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "connector_query_audit")
public class ConnectorQueryAuditEntity {

  @Id
  private UUID id;
  private UUID caseId;
  private String tableName;
  private int rowCount;
  private Instant queriedAt;

  protected ConnectorQueryAuditEntity() {}

  public ConnectorQueryAuditEntity(UUID id, UUID caseId, String tableName, int rowCount, Instant queriedAt) {
    this.id = id;
    this.caseId = caseId;
    this.tableName = tableName;
    this.rowCount = rowCount;
    this.queriedAt = queriedAt;
  }
}
