package com.disputecopilot.setup;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Backs the app's own database with a self-managed local Postgres instead of an external one
 * — only active in the packaged desktop build (see jpackage config / the "bundled" profile),
 * so a user can double-click the installer with no Docker or Postgres install of their own.
 * Data persists across restarts in a fixed local directory; the port is picked at launch
 * (DesktopRuntime.choosePorts) so another Postgres on 55432 isn't fatal. Dev/docker-compose setups are
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
  public EmbeddedPostgres embeddedPostgres(@Value("${app.embedded-postgres.port:55432}") int port) throws Exception {
    Path dataDir = DesktopRuntime.APP_DIR.resolve("pgdata");
    Files.createDirectories(dataDir.getParent());
    stopOrphanedPostgres(dataDir);
    return EmbeddedPostgres.builder()
        .setDataDirectory(dataDir)
        .setCleanDataDirectory(false)
        .setPort(port)
        .start();
  }

  /**
   * Postgres runs as a separate process. If the app was ended from Task Manager, that process
   * outlives it and keeps the data directory locked, so every later launch would fail. We hold
   * the single-instance lock (see DesktopRuntime), so a postgres still on our data dir is ours.
   * Killing it is crash-safe — Postgres recovers from its write-ahead log on the next start.
   */
  private static void stopOrphanedPostgres(Path dataDir) {
    try {
      Path pidFile = dataDir.resolve("postmaster.pid");
      if (!Files.exists(pidFile)) return;
      long pid = Long.parseLong(Files.readAllLines(pidFile).getFirst().strip());
      ProcessHandle.of(pid)
          .filter(p -> p.info().command().map(c -> c.toLowerCase().contains("postgres")).orElse(false))
          .ifPresent(p -> {
            p.destroyForcibly();
            p.onExit().orTimeout(15, TimeUnit.SECONDS).join();
          });
    } catch (Exception ignored) {
      // Best-effort — if it didn't work, start() below reports the real problem.
    }
  }

  @Bean
  public DataSource dataSource(EmbeddedPostgres postgres) {
    return postgres.getPostgresDatabase();
  }
}
