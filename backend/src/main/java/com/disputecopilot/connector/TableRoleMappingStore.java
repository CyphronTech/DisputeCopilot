package com.disputecopilot.connector;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Maps the app's five fixed roles (orders, payments, fulfillment, refunds, communications) to
 * whatever the merchant's real table/order-id-column names actually are. Plain JdbcTemplate
 * against the app's own DB, same pattern as TableAllowlistStore.
 */
@Component
public class TableRoleMappingStore {

  public record RoleMapping(String tableName, String orderIdColumn) {}

  private final JdbcTemplate jdbc;

  public TableRoleMappingStore(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, RoleMapping> load() {
    Map<String, RoleMapping> mapping = new LinkedHashMap<>();
    jdbc.query("select role, table_name, order_id_column from table_role_mapping order by role",
        rs -> { mapping.put(rs.getString("role"), new RoleMapping(rs.getString("table_name"), rs.getString("order_id_column"))); });
    return mapping;
  }

  @Transactional
  public void save(Map<String, RoleMapping> mapping) {
    jdbc.update("delete from table_role_mapping");
    for (var entry : mapping.entrySet()) {
      jdbc.update("insert into table_role_mapping (role, table_name, order_id_column) values (?, ?, ?)",
          entry.getKey(), entry.getValue().tableName(), entry.getValue().orderIdColumn());
    }
  }
}
