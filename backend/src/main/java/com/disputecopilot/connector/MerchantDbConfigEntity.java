package com.disputecopilot.connector;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "merchant_db_config")
public class MerchantDbConfigEntity {

  @Id
  private Boolean id = Boolean.TRUE;

  private String host;
  private int port;
  private String databaseName;
  private String username;
  private String password;
  private String driver;
  private Instant lastTestedAt;

  protected MerchantDbConfigEntity() {}

  public MerchantDbConfigEntity(String host, int port, String databaseName, String username, String password, String driver) {
    this.host = host;
    this.port = port;
    this.databaseName = databaseName;
    this.username = username;
    this.password = password;
    this.driver = driver;
  }

  public String getHost() { return host; }
  public int getPort() { return port; }
  public String getDatabaseName() { return databaseName; }
  public String getUsername() { return username; }
  public String getPassword() { return password; }
  public String getDriver() { return driver; }
  public Instant getLastTestedAt() { return lastTestedAt; }
  public void setLastTestedAt(Instant lastTestedAt) { this.lastTestedAt = lastTestedAt; }

  public String jdbcUrl() {
    return "jdbc:" + driver + "://" + host + ":" + port + "/" + databaseName;
  }
}
