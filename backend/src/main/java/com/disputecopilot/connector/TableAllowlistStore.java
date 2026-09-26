package com.disputecopilot.connector;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Plain JdbcTemplate against the app's own DB — the allowlist itself is admin config, not merchant data. */
@Component
public class TableAllowlistStore {

  private final JdbcTemplate jdbc;

  public TableAllowlistStore(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, List<String>> load() {
    Map<String, List<String>> allowlist = new LinkedHashMap<>();
    jdbc.query("select table_name, column_name from table_allowlist_entry order by table_name, column_name",
        rs -> {
          allowlist.computeIfAbsent(rs.getString("table_name"), t -> new java.util.ArrayList<>()).add(rs.getString("column_name"));
        });
    return allowlist;
  }

  @Transactional
  public void save(Map<String, List<String>> allowlist) {
    jdbc.update("delete from table_allowlist_entry");
    for (var entry : allowlist.entrySet()) {
      for (String column : entry.getValue()) {
        jdbc.update("insert into table_allowlist_entry (table_name, column_name) values (?, ?)", entry.getKey(), column);
      }
    }
  }
}
