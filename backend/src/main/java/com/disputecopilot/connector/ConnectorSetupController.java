package com.disputecopilot.connector;

import com.disputecopilot.audit.AuditRecorder;
import com.disputecopilot.setup.CryptoUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/setup/connector")
public class ConnectorSetupController {

  private final MerchantDbConfigJpaRepository configRepository;
  private final CryptoUtil crypto;
  private final SchemaDiscoveryService schemaDiscovery;
  private final TableAllowlistStore allowlistStore;
  private final TableRoleMappingStore roleMappingStore;
  private final SchemaMappingSuggester mappingSuggester;
  private final AuditRecorder audit;

  public ConnectorSetupController(
      MerchantDbConfigJpaRepository configRepository, CryptoUtil crypto,
      SchemaDiscoveryService schemaDiscovery, TableAllowlistStore allowlistStore,
      TableRoleMappingStore roleMappingStore, SchemaMappingSuggester mappingSuggester, AuditRecorder audit) {
    this.configRepository = configRepository;
    this.crypto = crypto;
    this.schemaDiscovery = schemaDiscovery;
    this.allowlistStore = allowlistStore;
    this.roleMappingStore = roleMappingStore;
    this.mappingSuggester = mappingSuggester;
    this.audit = audit;
  }

  public record SaveConnectorRequest(@NotBlank String host, int port, @NotBlank String database, @NotBlank String username, String password, String driver) {}
  public record ConnectorView(boolean configured, String host, Integer port, String database, String username, String driver, Instant lastTestedAt) {}
  public record TestResult(boolean ok, String message) {}
  public record AllowlistRequest(Map<String, List<String>> allowlist) {}

  @GetMapping
  public ConnectorView get() {
    return configRepository.findById(Boolean.TRUE)
        .map(c -> new ConnectorView(true, c.getHost(), c.getPort(), c.getDatabaseName(), c.getUsername(), c.getDriver(), c.getLastTestedAt()))
        .orElse(new ConnectorView(false, null, null, null, null, null, null));
  }

  @PutMapping
  public ConnectorView save(@Valid @RequestBody SaveConnectorRequest request) {
    MerchantDbConfigEntity existing = configRepository.findById(Boolean.TRUE).orElse(null);
    String password = (request.password() == null || request.password().isBlank()) && existing != null
        ? existing.getPassword() : crypto.encrypt(request.password());
    MerchantDbConfigEntity entity = new MerchantDbConfigEntity(
        request.host(), request.port(), request.database(), request.username(), password,
        request.driver() == null || request.driver().isBlank() ? "postgresql" : request.driver());
    configRepository.save(entity);
    audit.record("Merchant database connector updated", request.host() + ":" + request.port() + "/" + request.database(), null, "Admin", false, "setup", "neutral");
    return get();
  }

  @PostMapping("/test")
  public TestResult test() {
    try (var connection = schemaDiscovery.openConnection()) {
      connection.getMetaData();
      configRepository.findById(Boolean.TRUE).ifPresent(c -> {
        c.setLastTestedAt(Instant.now());
        configRepository.save(c);
      });
      return new TestResult(true, "Connected");
    } catch (Exception e) {
      return new TestResult(false, e.getMessage());
    }
  }

  @GetMapping("/schema")
  public Map<String, List<String>> schema() throws Exception {
    return schemaDiscovery.discover();
  }

  @GetMapping("/allowlist")
  public Map<String, List<String>> getAllowlist() {
    return allowlistStore.load();
  }

  /**
   * Allowlisted table/column names end up concatenated into the connector's SQL, so they are
   * checked against the live schema here rather than trusted from the request body — anything
   * that isn't a real table/column the merchant database actually has is rejected outright.
   */
  @PutMapping("/allowlist")
  public Map<String, List<String>> saveAllowlist(@RequestBody AllowlistRequest request) throws Exception {
    Map<String, List<String>> schema = schemaDiscovery.discover();
    for (var entry : request.allowlist().entrySet()) {
      List<String> realColumns = schema.get(entry.getKey());
      if (realColumns == null) {
        throw new IllegalArgumentException("No such table in the merchant database: " + entry.getKey());
      }
      for (String column : entry.getValue()) {
        if (!realColumns.contains(column)) {
          throw new IllegalArgumentException("No such column in " + entry.getKey() + ": " + column);
        }
      }
    }
    allowlistStore.save(request.allowlist());
    audit.record("Connector allowlist updated", request.allowlist().size() + " tables approved", null, "Admin", false, "setup", "neutral");
    return allowlistStore.load();
  }

  @GetMapping("/suggest-mapping")
  public Map<String, TableRoleMappingStore.RoleMapping> suggestMapping() throws Exception {
    return mappingSuggester.suggest(schemaDiscovery.discover());
  }

  @GetMapping("/role-mapping")
  public Map<String, TableRoleMappingStore.RoleMapping> getRoleMapping() {
    return roleMappingStore.load();
  }

  @PutMapping("/role-mapping")
  public Map<String, TableRoleMappingStore.RoleMapping> saveRoleMapping(@RequestBody Map<String, TableRoleMappingStore.RoleMapping> mapping) throws Exception {
    Map<String, List<String>> schema = schemaDiscovery.discover();
    Map<String, TableRoleMappingStore.RoleMapping> validated = new java.util.LinkedHashMap<>();
    for (var entry : mapping.entrySet()) {
      TableRoleMappingStore.RoleMapping m = entry.getValue();
      List<String> columns = schema.get(m.tableName());
      if (columns == null || !columns.contains(m.orderIdColumn())) continue;
      validated.put(entry.getKey(), new TableRoleMappingStore.RoleMapping(m.tableName(), m.orderIdColumn(),
          validColumns(columns, m.customerNameColumn()), validColumn(columns, m.customerEmailColumn()),
          validColumn(columns, m.statusColumn()), m.issuedValue(), validColumn(columns, m.customerIdColumn())));
    }
    roleMappingStore.save(validated);
    audit.record("Table role mapping updated", validated.size() + " roles mapped", null, "Admin", false, "setup", "neutral");
    return roleMappingStore.load();
  }

  private String validColumn(List<String> columns, String candidate) {
    return candidate != null && columns.contains(candidate) ? candidate : null;
  }

  /** "first_name,last_name": keeps only the parts that really are columns of this table. */
  static String validColumns(List<String> columns, String candidate) {
    if (candidate == null) return null;
    String kept = java.util.Arrays.stream(candidate.split(",")).map(String::strip).filter(columns::contains)
        .collect(java.util.stream.Collectors.joining(","));
    return kept.isEmpty() ? null : kept;
  }
}
