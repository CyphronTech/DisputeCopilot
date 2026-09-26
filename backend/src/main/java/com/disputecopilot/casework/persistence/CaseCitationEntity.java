package com.disputecopilot.casework.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "case_citation")
public class CaseCitationEntity {

  @Id
  private UUID id;
  private UUID caseId;
  private UUID documentId;
  private String title;
  private String version;
  private String quote;

  protected CaseCitationEntity() {}

  public CaseCitationEntity(UUID id, UUID caseId, UUID documentId, String title, String version, String quote) {
    this.id = id;
    this.caseId = caseId;
    this.documentId = documentId;
    this.title = title;
    this.version = version;
    this.quote = quote;
  }

  public UUID getId() { return id; }
  public UUID getCaseId() { return caseId; }
  public UUID getDocumentId() { return documentId; }
  public String getTitle() { return title; }
  public String getVersion() { return version; }
  public String getQuote() { return quote; }
}
