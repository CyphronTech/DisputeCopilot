package com.disputecopilot.setup;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.sql.DataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Backs the app's own database with a self-managed local Postgres instead of an external one
 * — only active in the packaged desktop build (see jpackage config / the "bundled" profile),
 * so a user can double-click the installer with no Docker or Postgres install of their own.
 * Data persists across restarts in a fixed local directory. Dev/docker-compose setups are
 * untouched since this bean only exists under the "bundled" profile.
 *
 * ponytail: getPostgresDatabase() is a plain (unpooled) DataSource, not HikariCP — fine for a
 * single-tenant desktop app's low concurrency, revisit if this ever needs to serve more than a
 * handful of concurrent users.
 */
@Configuration
@Profile("bundled")
public class BundledPostgresConfig {

  @Bean(destroyMethod = "close")
  public EmbeddedPostgres embeddedPostgres() throws Exception {
    Path dataDir = Path.of(System.getProperty("user.home"), "AppData", "Local", "DisputeCopilot", "pgdata");
    Files.createDirectories(dataDir.getParent());
    return EmbeddedPostgres.builder()
        .setDataDirectory(dataDir)
        .setCleanDataDirectory(false)
        .setPort(55432)
        .start();
  }

  @Bean
  public DataSource dataSource(EmbeddedPostgres postgres) {
    return postgres.getPostgresDatabase();
  }
}
