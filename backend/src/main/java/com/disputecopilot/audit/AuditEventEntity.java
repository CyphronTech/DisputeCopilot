package com.disputecopilot.audit;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_event")
public class AuditEventEntity {

  @Id
  private UUID id;
  private String title;
  private String detail;
  private String orderId;
  private String actorName;
  private boolean actorIsSystem;
  private String icon;
  private String tone;
  private Instant occurredAt;

  protected AuditEventEntity() {}

  public AuditEventEntity(UUID id, String title, String detail, String orderId, String actorName, boolean actorIsSystem, String icon, String tone, Instant occurredAt) {
    this.id = id;
    this.title = title;
    this.detail = detail;
    this.orderId = orderId;
    this.actorName = actorName;
    this.actorIsSystem = actorIsSystem;
    this.icon = icon;
    this.tone = tone;
    this.occurredAt = occurredAt;
  }

  public UUID getId() { return id; }
  public String getTitle() { return title; }
  public String getDetail() { return detail; }
  public String getOrderId() { return orderId; }
  public String getActorName() { return actorName; }
  public boolean isActorIsSystem() { return actorIsSystem; }
  public String getIcon() { return icon; }
  public String getTone() { return tone; }
  public Instant getOccurredAt() { return occurredAt; }
}
