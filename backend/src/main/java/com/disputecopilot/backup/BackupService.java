package com.disputecopilot.backup;

import com.disputecopilot.audit.AuditRecorder;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.time.Instant;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import javax.sql.DataSource;
import org.postgresql.PGConnection;
import org.springframework.stereotype.Service;

/**
 * Manual export/import of every table the app itself owns — never merchant data; the connector
 * never touches the merchant's database here. The embedded Postgres this app bundles ships
 * without pg_dump/pg_restore, so tables are copied with Postgres's own COPY protocol (exposed by
 * the JDBC driver we already depend on) instead of adding a dependency or hand-rolling a
 * serializer. Restore truncates with CASCADE first, so the write order below only has to be
 * parent-before-child for readability — it isn't load-bearing for correctness.
 *
 * ponytail: a "download the file, keep it somewhere safe" flow, not scheduled/automatic backups
 * or off-machine storage — this is a single-merchant desktop app with no server to schedule on.
 * Add scheduling if this ever runs unattended for long stretches without anyone thinking to back
 * up manually.
 */
@Service
public class BackupService {

  private static final List<String> TABLES = List.of(
      "admin_account", "model_config", "merchant_db_config", "shopify_config",
      "table_allowlist_entry", "table_role_mapping", "policy_document",
      "case_record", "evidence_item", "case_citation", "connector_query_audit", "audit_event");

  private final DataSource dataSource;
  private final AuditRecorder audit;

  public BackupService(DataSource dataSource, AuditRecorder audit) {
    this.dataSource = dataSource;
    this.audit = audit;
  }

  public void backup(OutputStream out) {
    try (Connection connection = dataSource.getConnection();
        ZipOutputStream zip = new ZipOutputStream(out)) {
      PGConnection pg = connection.unwrap(PGConnection.class);
      for (String table : TABLES) {
        zip.putNextEntry(new ZipEntry(table + ".csv"));
        pg.getCopyAPI().copyOut("COPY " + table + " TO STDOUT WITH (FORMAT csv, HEADER true)", zip);
        zip.closeEntry();
      }
      Path secretKey = secretKeyPath();
      if (Files.exists(secretKey)) {
        zip.putNextEntry(new ZipEntry("secret.key"));
        zip.write(Files.readAllBytes(secretKey));
        zip.closeEntry();
      }
      zip.putNextEntry(new ZipEntry("manifest.txt"));
      zip.write(("DisputeCopilot backup, created " + Instant.now()).getBytes(StandardCharsets.UTF_8));
      zip.closeEntry();
    } catch (Exception e) {
      throw new IllegalStateException("Could not build the backup: " + e.getMessage(), e);
    }
    audit.record("Backup downloaded", "a full data backup was exported", null, "Admin", false, "file", "neutral");
  }

  /**
   * Replaces every row in every app table with what's in the zip, inside one transaction — a
   * failure partway through leaves the existing data untouched. If the zip carries a secret.key
   * (a bundled install's per-machine encryption key), it's written to disk, but the running
   * process already has the OLD key loaded — encrypted fields (API keys, DB passwords) will read
   * back as garbage until the app is restarted, at which point the restored key takes over. Setup
   * already treats an undecryptable key as "re-enter it" rather than crashing, so this is a safe
   * (if confusing until restarted) degradation, not a failure.
   */
  public void restore(InputStream in) {
    byte[] zipBytes;
    try {
      zipBytes = in.readAllBytes();
    } catch (IOException e) {
      throw new IllegalStateException("Could not read the uploaded backup file.", e);
    }

    // Validate BEFORE truncating anything. A malformed/unrelated zip parses as simply having no
    // entries rather than throwing, so without this check a garbage upload would wipe every table
    // and restore nothing back — a 200 response that silently destroyed the merchant's data.
    byte[] secretKeyBytes = null;
    java.util.Set<String> foundTables = new java.util.LinkedHashSet<>();
    boolean hasManifest = false;
    try (ZipInputStream probe = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
      ZipEntry entry;
      while ((entry = probe.getNextEntry()) != null) {
        String name = entry.getName();
        if (name.equals("secret.key")) secretKeyBytes = probe.readAllBytes();
        else if (name.equals("manifest.txt")) hasManifest = true;
        else if (name.endsWith(".csv") && TABLES.contains(name.substring(0, name.length() - 4))) foundTables.add(name);
      }
    } catch (IOException e) {
      throw new IllegalArgumentException("This file isn't a valid backup — it couldn't be read as a zip.");
    }
    if (!hasManifest || foundTables.isEmpty()) {
      throw new IllegalArgumentException("This doesn't look like a DisputeCopilot backup file.");
    }

    try (Connection connection = dataSource.getConnection()) {
      connection.setAutoCommit(false);
      try {
        try (var statement = connection.createStatement()) {
          statement.execute("TRUNCATE " + String.join(", ", TABLES) + " RESTART IDENTITY CASCADE");
        }
        PGConnection pg = connection.unwrap(PGConnection.class);
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
          ZipEntry entry;
          while ((entry = zip.getNextEntry()) != null) {
            String name = entry.getName();
            if (!name.endsWith(".csv") || !TABLES.contains(name.substring(0, name.length() - 4))) continue;
            String table = name.substring(0, name.length() - 4);
            pg.getCopyAPI().copyIn("COPY " + table + " FROM STDIN WITH (FORMAT csv, HEADER true)", zip);
          }
        }
        connection.commit();
      } catch (Exception e) {
        connection.rollback();
        throw new IllegalStateException("Could not restore from this backup — no changes were made. (" + e.getMessage() + ")", e);
      }
    } catch (java.sql.SQLException e) {
      throw new IllegalStateException("Could not restore from this backup: " + e.getMessage(), e);
    }

    if (secretKeyBytes != null) {
      try {
        Path secretKey = secretKeyPath();
        Files.createDirectories(secretKey.getParent());
        Files.write(secretKey, secretKeyBytes);
      } catch (IOException e) {
        throw new IllegalStateException("Data was restored, but the encryption key file couldn't be written: " + e.getMessage(), e);
      }
    }
    audit.record("Backup restored", "all data was replaced from an uploaded backup — restart the app to finish", null, "Admin", false, "alert", "warn");
  }

  /** Same path LocalSecretKey computes — duplicated rather than shared, it's one line and the two classes have no other reason to depend on each other. */
  private Path secretKeyPath() {
    return Path.of(System.getProperty("user.home"), "AppData", "Local", "DisputeCopilot", "secret.key");
  }
}
