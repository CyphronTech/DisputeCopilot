package com.disputecopilot.casework.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "evidence_item")
public class EvidenceItemEntity {

  @Id
  private UUID id;
  private UUID caseId;
  private String kind;
  private String title;
  private String description;
  private String sourceRef;
  private String observedAt;

  protected EvidenceItemEntity() {}

  public EvidenceItemEntity(UUID id, UUID caseId, String kind, String title, String description, String sourceRef, String observedAt) {
    this.id = id;
    this.caseId = caseId;
    this.kind = kind;
    this.title = title;
    this.description = description;
    this.sourceRef = sourceRef;
    this.observedAt = observedAt;
  }

  public UUID getId() { return id; }
  public UUID getCaseId() { return caseId; }
  public String getKind() { return kind; }
  public String getTitle() { return title; }
  public String getDescription() { return description; }
  public String getSourceRef() { return sourceRef; }
  public String getObservedAt() { return observedAt; }
}
