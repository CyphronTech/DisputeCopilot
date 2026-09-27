package com.disputecopilot.setup;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Gives each packaged install its own encryption key for the stored provider API key.
 *
 * Without this every install falls back to the same built-in default from application.yml, so
 * anyone holding a copy of one merchant's database file could decrypt another's API key. The
 * key is generated once on first run and kept next to the embedded Postgres data directory.
 *
 * Runs before Spring starts (from main) and publishes the key as a system property, which
 * outranks the application.yml default that ${app.secret-key} would otherwise resolve to.
 */
public final class LocalSecretKey {

  private LocalSecretKey() {}

  public static void initialiseIfBundled() {
    if (!"bundled".equals(System.getProperty("spring.profiles.active"))) return;
    // An explicitly supplied key wins — an operator managing their own key should keep it.
    if (System.getenv("SECRET_KEY") != null || System.getProperty("app.secret-key") != null) return;
    try {
      Path keyFile = Path.of(System.getProperty("user.home"), "AppData", "Local", "DisputeCopilot", "secret.key");
      if (!Files.exists(keyFile)) {
        Files.createDirectories(keyFile.getParent());
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        Files.writeString(keyFile, Base64.getEncoder().encodeToString(random), StandardCharsets.UTF_8);
      }
      System.setProperty("app.secret-key", Files.readString(keyFile, StandardCharsets.UTF_8).strip());
    } catch (Exception e) {
      throw new IllegalStateException("Could not establish a local encryption key: " + e.getMessage(), e);
    }
  }
}
