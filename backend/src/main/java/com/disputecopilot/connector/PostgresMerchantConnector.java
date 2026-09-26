package com.disputecopilot.connector;

import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Every read here is order-scoped and allowlist-checked before any SQL runs.
 * The table name is the only thing a caller supplies; the query text is always
 * built here from the approved column list, never from caller-supplied SQL.
 *
 * ponytail: dev/demo profile points this at the same Postgres as the app's own
 * tables (the fixture merchant tables from V1). A real deployment gives this a
 * second datasource pointing at the merchant's actual database — swap the
 * JdbcTemplate bean below when that's needed, nothing else in this class changes.
 */
@Component
@EnableConfigurationProperties(ConnectorAllowlistProperties.class)
public class PostgresMerchantConnector implements MerchantConnector {

  private final NamedParameterJdbcTemplate jdbc;
  private final ConnectorAllowlistProperties allowlist;

  public PostgresMerchantConnector(JdbcTemplate jdbcTemplate, ConnectorAllowlistProperties allowlist) {
    this.jdbc = new NamedParameterJdbcTemplate(jdbcTemplate);
    this.allowlist = allowlist;
  }

  @Override
  public List<Map<String, Object>> readApprovedTable(String table, String orderId) {
    List<String> columns = allowlist.allowlist().get(table);
    if (columns == null) {
      throw new IllegalArgumentException("Table not on the approved allowlist: " + table);
    }
    String columnList = String.join(", ", columns);
    String sql = "select " + columnList + " from " + table + " where order_id = :orderId limit 1";
    return jdbc.queryForList(sql, new MapSqlParameterSource("orderId", orderId));
  }

  @Override
  public List<String> approvedTables() {
    return List.copyOf(allowlist.allowlist().keySet());
  }
}
