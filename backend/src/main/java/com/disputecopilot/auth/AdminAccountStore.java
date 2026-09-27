package com.disputecopilot.auth;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** The one admin login, kept in the app DB as a bcrypt hash (see V17). */
@Component
public class AdminAccountStore {

  public static final int MIN_PASSWORD_LENGTH = 8;

  public record Account(String email, String passwordHash) {}

  private final JdbcTemplate jdbc;

  public AdminAccountStore(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Account find() {
    List<Account> rows = jdbc.query("select email, password_hash from admin_account",
        (rs, i) -> new Account(rs.getString("email"), rs.getString("password_hash")));
    return rows.isEmpty() ? null : rows.getFirst();
  }

  /** First-run only: returns false if an account already exists, so this can never overwrite one. */
  public boolean createIfAbsent(String email, String passwordHash) {
    return jdbc.update("insert into admin_account (email, password_hash) values (?, ?) on conflict (id) do nothing",
        email, passwordHash) == 1;
  }

  public void upsert(String email, String passwordHash) {
    jdbc.update("""
        insert into admin_account (email, password_hash) values (?, ?)
        on conflict (id) do update set email = excluded.email, password_hash = excluded.password_hash, updated_at = now()""",
        email, passwordHash);
  }

  /** Null when the password is acceptable, otherwise a message fit to show the user. */
  public static String passwordProblem(String password) {
    if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
      return "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.";
    }
    if (password.isBlank()) return "Password can't be only spaces.";
    return null;
  }

  static String normaliseEmail(String email) {
    return email == null ? "" : email.strip().toLowerCase(java.util.Locale.ROOT);
  }
}
