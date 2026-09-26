package com.disputecopilot.connector;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Every read here is order-scoped and allowlist-checked before any SQL runs.
 * The table name is the only thing a caller supplies; the query text is always
 * built here from the approved column list, never from caller-supplied SQL.
 *
 * The allowlist and connection come from admin-approved setup (Setup > Merchant
 * database connector) if configured, saved via SchemaDiscoveryService / TableAllowlistStore.
 * Falls back to the YAML fixture allowlist for local demo/dev when nothing's been configured.
 *
 * Does not implement MerchantConnector directly — MerchantConnectorRouter picks between
 * this and ShopifyMerchantConnector depending on which the admin has configured.
 */
@Component
@EnableConfigurationProperties(ConnectorAllowlistProperties.class)
public class PostgresMerchantConnector {

  private final SchemaDiscoveryService schemaDiscovery;
  private final TableAllowlistStore allowlistStore;
  private final ConnectorAllowlistProperties fixtureAllowlist;

  public PostgresMerchantConnector(SchemaDiscoveryService schemaDiscovery, TableAllowlistStore allowlistStore, ConnectorAllowlistProperties fixtureAllowlist) {
    this.schemaDiscovery = schemaDiscovery;
    this.allowlistStore = allowlistStore;
    this.fixtureAllowlist = fixtureAllowlist;
  }

  private Map<String, List<String>> allowlist() {
    Map<String, List<String>> configured = allowlistStore.load();
    return configured.isEmpty() ? fixtureAllowlist.allowlist() : configured;
  }

  public List<Map<String, Object>> readApprovedTable(String table, String orderId) {
    List<String> columns = allowlist().get(table);
    if (columns == null) {
      throw new IllegalArgumentException("Table not on the approved allowlist: " + table);
    }
    String columnList = String.join(", ", columns);
    String sql = "select " + columnList + " from " + table + " where order_id = ? limit 1";
    try (Connection connection = schemaDiscovery.openConnection();
        PreparedStatement statement = connection.prepareStatement(sql)) {
      statement.setString(1, orderId);
      try (ResultSet resultSet = statement.executeQuery()) {
        return toRows(resultSet);
      }
    } catch (Exception e) {
      throw new IllegalStateException("Connector read failed for table " + table + ": " + e.getMessage(), e);
    }
  }

  private List<Map<String, Object>> toRows(ResultSet resultSet) throws Exception {
    ResultSetMetaData metadata = resultSet.getMetaData();
    List<Map<String, Object>> rows = new ArrayList<>();
    while (resultSet.next()) {
      Map<String, Object> row = new LinkedHashMap<>();
      for (int i = 1; i <= metadata.getColumnCount(); i++) {
        row.put(metadata.getColumnName(i), resultSet.getObject(i));
      }
      rows.add(row);
    }
    return rows;
  }

  public List<String> approvedTables() {
    return List.copyOf(allowlist().keySet());
  }
}
