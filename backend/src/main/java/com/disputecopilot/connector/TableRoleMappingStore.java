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

  /**
   * customerNameColumn/customerEmailColumn only apply to the "orders" role; statusColumn/
   * issuedValue only apply to "refunds". Null for every other role — one record shape is
   * simpler than a table per role for four optional fields.
   */
  public record RoleMapping(String tableName, String orderIdColumn, String customerNameColumn,
      String customerEmailColumn, String statusColumn, String issuedValue) {
    public RoleMapping(String tableName, String orderIdColumn) {
      this(tableName, orderIdColumn, null, null, null, null);
    }
  }

  private final JdbcTemplate jdbc;

  public TableRoleMappingStore(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, RoleMapping> load() {
    Map<String, RoleMapping> mapping = new LinkedHashMap<>();
    jdbc.query("select role, table_name, order_id_column, customer_name_column, customer_email_column, status_column, issued_value from table_role_mapping order by role",
        rs -> { mapping.put(rs.getString("role"), new RoleMapping(rs.getString("table_name"), rs.getString("order_id_column"),
            rs.getString("customer_name_column"), rs.getString("customer_email_column"), rs.getString("status_column"), rs.getString("issued_value"))); });
    return mapping;
  }

  @Transactional
  public void save(Map<String, RoleMapping> mapping) {
    jdbc.update("delete from table_role_mapping");
    for (var entry : mapping.entrySet()) {
      RoleMapping m = entry.getValue();
      jdbc.update("insert into table_role_mapping (role, table_name, order_id_column, customer_name_column, customer_email_column, status_column, issued_value) values (?, ?, ?, ?, ?, ?, ?)",
          entry.getKey(), m.tableName(), m.orderIdColumn(), m.customerNameColumn(), m.customerEmailColumn(), m.statusColumn(), m.issuedValue());
    }
  }
}
