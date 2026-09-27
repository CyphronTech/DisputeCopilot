package com.disputecopilot.connector;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

/**
 * Table and column names cannot be bound as SQL parameters, so they are concatenated into the
 * query. This is the guard that stands between the stored allowlist and that concatenation.
 */
class PostgresMerchantConnectorTest {

  @Test
  void acceptsOrdinaryTableAndColumnNames() {
    assertEquals("orders", PostgresMerchantConnector.requireSafeIdentifier("orders"));
    assertEquals("order_items", PostgresMerchantConnector.requireSafeIdentifier("order_items"));
    assertEquals("_private2", PostgresMerchantConnector.requireSafeIdentifier("_private2"));
  }

  @Test
  void rejectsStatementTerminatorsAndComments() {
    assertThrows(IllegalArgumentException.class,
        () -> PostgresMerchantConnector.requireSafeIdentifier("amount; drop table case_record --"));
    assertThrows(IllegalArgumentException.class,
        () -> PostgresMerchantConnector.requireSafeIdentifier("1 from orders union select password from users"));
    assertThrows(IllegalArgumentException.class,
        () -> PostgresMerchantConnector.requireSafeIdentifier("col--comment"));
  }

  @Test
  void rejectsQuotingAndWhitespaceTricks() {
    assertThrows(IllegalArgumentException.class, () -> PostgresMerchantConnector.requireSafeIdentifier("\"orders\""));
    assertThrows(IllegalArgumentException.class, () -> PostgresMerchantConnector.requireSafeIdentifier("a b"));
    assertThrows(IllegalArgumentException.class, () -> PostgresMerchantConnector.requireSafeIdentifier("a'b"));
    assertThrows(IllegalArgumentException.class, () -> PostgresMerchantConnector.requireSafeIdentifier("*"));
  }

  @Test
  void rejectsNullAndEmpty() {
    assertThrows(IllegalArgumentException.class, () -> PostgresMerchantConnector.requireSafeIdentifier(null));
    assertThrows(IllegalArgumentException.class, () -> PostgresMerchantConnector.requireSafeIdentifier(""));
  }
}
