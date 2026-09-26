package com.disputecopilot.connector;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** The only bean implementing MerchantConnector — picks Shopify or the direct-database connector based on what's configured in Setup. */
@Component
public class MerchantConnectorRouter implements MerchantConnector {

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

  @Override
  public List<Map<String, Object>> readApprovedTable(String table, String orderId) {
    return useShopify() ? shopifyConnector.readApprovedTable(table, orderId) : databaseConnector.readApprovedTable(table, orderId);
  }

  @Override
  public List<String> approvedTables() {
    return useShopify() ? shopifyConnector.approvedTables() : databaseConnector.approvedTables();
  }
}
