package com.disputecopilot.connector;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * The only way any code (or agent) reads merchant data. Picks Shopify or the direct-database
 * connector based on what's configured in Setup. Every read is scoped to one order and checked
 * against the admin-approved allowlist before it runs.
 */
@Component
public class MerchantConnectorRouter {

  private final PostgresMerchantConnector databaseConnector;
  private final ShopifyMerchantConnector shopifyConnector;
  private final ShopifyConfigJpaRepository shopifyConfig;

  public MerchantConnectorRouter(PostgresMerchantConnector databaseConnector, ShopifyMerchantConnector shopifyConnector, ShopifyConfigJpaRepository shopifyConfig) {
    this.databaseConnector = databaseConnector;
    this.shopifyConnector = shopifyConnector;
    this.shopifyConfig = shopifyConfig;
  }

  private boolean useShopify() {
    return shopifyConfig.findById(Boolean.TRUE).isPresent();
  }

  /** @throws IllegalArgumentException if table is not on the approved allowlist. */
  public List<Map<String, Object>> readApprovedTable(String table, String orderId) {
    return useShopify() ? shopifyConnector.readApprovedTable(table, orderId) : databaseConnector.readApprovedTable(table, orderId);
  }

  public List<String> approvedTables() {
    return useShopify() ? shopifyConnector.approvedTables() : databaseConnector.approvedTables();
  }
}
