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
 * Callers pass a role name (orders/payments/fulfillment/refunds/communications), not a raw
 * table name — TableRoleMappingStore resolves that to the merchant's actual table and
 * order-id column, so a real deployment isn't forced to use the fixture's exact schema
 * naming. If no role mapping has been saved, the role is used as the literal table name and
 * "order_id" as the join column, matching the original fixture-only behavior.
 *
 * Does not implement MerchantConnector directly — MerchantConnectorRouter picks between
 * this and ShopifyMerchantConnector depending on which the admin has configured.
 */
@Component
@EnableConfigurationProperties(ConnectorAllowlistProperties.class)
public class PostgresMerchantConnector {

  private static final List<String> ROLES = List.of("orders", "payments", "fulfillment", "refunds", "returns", "communications");

  /**
   * Table and column names are concatenated into SQL (they can't be bound as parameters), so
   * every identifier is checked against this before it reaches a statement. The allowlist is
   * admin-approved and validated on save, but this is the single chokepoint every read goes
   * through — enforcing it here means no future caller or storage path can smuggle SQL in.
   */
  private static final java.util.regex.Pattern SAFE_IDENTIFIER = java.util.regex.Pattern.compile("[A-Za-z_][A-Za-z0-9_$]*");

  static String requireSafeIdentifier(String identifier) {
    if (identifier == null || !SAFE_IDENTIFIER.matcher(identifier).matches()) {
      throw new IllegalArgumentException("Unsafe SQL identifier: " + identifier);
    }
    return identifier;
  }

  private final SchemaDiscoveryService schemaDiscovery;
  private final TableAllowlistStore allowlistStore;
  private final ConnectorAllowlistProperties fixtureAllowlist;
  private final TableRoleMappingStore roleMappingStore;

  public PostgresMerchantConnector(SchemaDiscoveryService schemaDiscovery, TableAllowlistStore allowlistStore,
      ConnectorAllowlistProperties fixtureAllowlist, TableRoleMappingStore roleMappingStore) {
    this.schemaDiscovery = schemaDiscovery;
    this.allowlistStore = allowlistStore;
    this.fixtureAllowlist = fixtureAllowlist;
    this.roleMappingStore = roleMappingStore;
  }

  private Map<String, List<String>> allowlist() {
    Map<String, List<String>> configured = allowlistStore.load();
    return configured.isEmpty() ? fixtureAllowlist.allowlist() : configured;
  }

  public List<Map<String, Object>> readApprovedTable(String role, String orderId) {
    TableRoleMappingStore.RoleMapping mapped = roleMappingStore.load().get(role);
    String table = mapped != null ? mapped.tableName() : role;
    String orderIdColumn = mapped != null ? mapped.orderIdColumn() : "order_id";

    List<String> columns = allowlist().get(table);
    if (columns == null) {
      throw new IllegalArgumentException("Table not on the approved allowlist: " + table);
    }
    requireSafeIdentifier(table);
    requireSafeIdentifier(orderIdColumn);
    String columnList = columns.stream().map(PostgresMerchantConnector::requireSafeIdentifier).collect(java.util.stream.Collectors.joining(", "));
    // Cast to text: the order-id column's real type varies by merchant schema (int, bigint,
    // uuid, varchar, ...) but the order ID always arrives here as a String — casting the
    // column instead of guessing its type works regardless of what it actually is.
    String sql = "select " + columnList + " from " + table + " where " + orderIdColumn + "::text = ? limit 1";
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

  /** Each role falls back to its own literal table name independently, so an admin mapping
   *  only some roles doesn't silently drop evidence collection for the rest. */
  public List<String> approvedTables() {
    Map<String, TableRoleMappingStore.RoleMapping> roleMapping = roleMappingStore.load();
    Map<String, List<String>> allowlist = allowlist();
    List<String> result = new ArrayList<>();
    for (String role : ROLES) {
      TableRoleMappingStore.RoleMapping mapped = roleMapping.get(role);
      String table = mapped != null ? mapped.tableName() : role;
      if (allowlist.containsKey(table)) result.add(role);
    }
    return result;
  }
}
