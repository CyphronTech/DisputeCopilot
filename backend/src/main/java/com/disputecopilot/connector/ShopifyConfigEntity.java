package com.disputecopilot.connector;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "shopify_config")
public class ShopifyConfigEntity {

  @Id
  private Boolean id = Boolean.TRUE;

  private String shopDomain;
  private String accessToken;
  private Instant lastTestedAt;

  protected ShopifyConfigEntity() {}

  public ShopifyConfigEntity(String shopDomain, String accessToken) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
  }

  public String getShopDomain() { return shopDomain; }
  public String getAccessToken() { return accessToken; }
  public Instant getLastTestedAt() { return lastTestedAt; }
  public void setLastTestedAt(Instant lastTestedAt) { this.lastTestedAt = lastTestedAt; }
}
