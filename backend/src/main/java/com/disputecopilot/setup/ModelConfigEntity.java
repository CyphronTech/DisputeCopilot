package com.disputecopilot.setup;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "model_config")
public class ModelConfigEntity {

  @Id
  private Boolean id = Boolean.TRUE;

  private String provider;
  private String baseUrl;
  private String apiKey;
  private String model;
  private Instant lastTestedAt;

  protected ModelConfigEntity() {}

  public ModelConfigEntity(String provider, String baseUrl, String apiKey, String model) {
    this.provider = provider;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  public String getProvider() { return provider; }
  public String getBaseUrl() { return baseUrl; }
  public String getApiKey() { return apiKey; }
  public String getModel() { return model; }
  public Instant getLastTestedAt() { return lastTestedAt; }
  public void setLastTestedAt(Instant lastTestedAt) { this.lastTestedAt = lastTestedAt; }
}
