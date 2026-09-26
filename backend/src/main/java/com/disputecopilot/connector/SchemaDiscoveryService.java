package com.disputecopilot.connector;

import com.disputecopilot.setup.CryptoUtil;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.sql.DataSource;
import org.springframework.stereotype.Service;

/**
 * Reads catalog metadata only (table/column names via JDBC DatabaseMetaData) — never row
 * data — so an admin can see what's available before approving anything. Nothing here
 * persists; the admin's approved subset is saved separately via TableAllowlistStore.
 */
@Service
public class SchemaDiscoveryService {

  // ponytail: the app's own operational tables are hidden from discovery so an admin can't
  // accidentally allowlist them for agent reads — this list grows if new app tables are added.
  private static final Set<String> APP_OWNED_TABLES = Set.of(
      "case_record", "evidence_item", "connector_query_audit", "audit_event", "policy_document",
      "case_citation", "model_config", "merchant_db_config", "table_allowlist_entry", "flyway_schema_history");

  private final MerchantDbConfigJpaRepository configRepository;
  private final CryptoUtil crypto;
  private final DataSource appDataSource;

  public SchemaDiscoveryService(MerchantDbConfigJpaRepository configRepository, CryptoUtil crypto, DataSource appDataSource) {
    this.configRepository = configRepository;
    this.crypto = crypto;
    this.appDataSource = appDataSource;
  }

  public Map<String, List<String>> discover() throws Exception {
    try (Connection connection = openConnection()) {
      Map<String, List<String>> tables = new LinkedHashMap<>();
      DatabaseMetaData metadata = connection.getMetaData();
      try (ResultSet tableRs = metadata.getTables(null, "public", "%", new String[] {"TABLE"})) {
        while (tableRs.next()) {
          String table = tableRs.getString("TABLE_NAME");
          if (APP_OWNED_TABLES.contains(table)) continue;
          tables.put(table, new java.util.ArrayList<>());
        }
      }
      for (String table : tables.keySet()) {
        try (ResultSet columnRs = metadata.getColumns(null, "public", table, "%")) {
          while (columnRs.next()) {
            tables.get(table).add(columnRs.getString("COLUMN_NAME"));
          }
        }
      }
      return tables;
    }
  }

  public Connection openConnection() throws Exception {
    return configRepository.findById(Boolean.TRUE)
        .map(this::openExternalConnection)
        .orElseGet(this::openAppConnectionUnchecked);
  }

  private Connection openExternalConnection(MerchantDbConfigEntity config) {
    try {
      return DriverManager.getConnection(config.jdbcUrl(), config.getUsername(), crypto.decrypt(config.getPassword()));
    } catch (Exception e) {
      throw new IllegalStateException("Could not connect to the merchant database: " + e.getMessage(), e);
    }
  }

  private Connection openAppConnectionUnchecked() {
    try {
      return appDataSource.getConnection();
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
