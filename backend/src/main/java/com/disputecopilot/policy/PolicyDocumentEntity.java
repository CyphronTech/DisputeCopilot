package com.disputecopilot.policy;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "policy_document")
public class PolicyDocumentEntity {

  @Id
  private UUID id;
  private String title;
  private String filename;
  private String version;
  private String status;
  private LocalDate effectiveFrom;
  private LocalDate effectiveTo;
  private String content;

  protected PolicyDocumentEntity() {}

  public PolicyDocumentEntity(UUID id, String title, String filename, String version, String status, LocalDate effectiveFrom, LocalDate effectiveTo, String content) {
    this.id = id;
    this.title = title;
    this.filename = filename;
    this.version = version;
    this.status = status;
    this.effectiveFrom = effectiveFrom;
    this.effectiveTo = effectiveTo;
    this.content = content;
  }

  public UUID getId() { return id; }
  public String getTitle() { return title; }
  public String getFilename() { return filename; }
  public String getVersion() { return version; }
  public String getStatus() { return status; }
  public LocalDate getEffectiveFrom() { return effectiveFrom; }
  public LocalDate getEffectiveTo() { return effectiveTo; }
  public String getContent() { return content; }
}
