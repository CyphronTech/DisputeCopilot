package com.disputecopilot.casework.persistence;

import com.disputecopilot.casework.domain.CaseState;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "case_record")
public class CaseEntity {

  @Id
  private UUID id;
  private String orderId;
  private String customerName;
  private String customerEmail;

  @Enumerated(EnumType.STRING)
  private CaseState state;

  private Instant createdAt;

  private String recommendation;
  private Double confidence;
  private String caveat;
  private String summary;

  protected CaseEntity() {}

  public CaseEntity(UUID id, String orderId, String customerName, String customerEmail, CaseState state, Instant createdAt) {
    this.id = id;
    this.orderId = orderId;
    this.customerName = customerName;
    this.customerEmail = customerEmail;
    this.state = state;
    this.createdAt = createdAt;
  }

  public UUID getId() { return id; }
  public String getOrderId() { return orderId; }
  public String getCustomerName() { return customerName; }
  public String getCustomerEmail() { return customerEmail; }
  public CaseState getState() { return state; }
  public void setState(CaseState state) { this.state = state; }
  public Instant getCreatedAt() { return createdAt; }
  public String getRecommendation() { return recommendation; }
  public Double getConfidence() { return confidence; }
  public String getCaveat() { return caveat; }
  public String getSummary() { return summary; }

  public void applyReview(String recommendation, Double confidence, String caveat, String summary, CaseState state) {
    this.recommendation = recommendation;
    this.confidence = confidence;
    this.caveat = caveat;
    this.summary = summary;
    this.state = state;
  }
}
