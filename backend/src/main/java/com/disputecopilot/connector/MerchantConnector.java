package com.disputecopilot.connector;

import java.util.List;
import java.util.Map;

/**
 * The only way any code (or agent) reads merchant data. Every read is scoped to one
 * order and checked against the admin-approved allowlist before it runs.
 */
public interface MerchantConnector {

  /** @throws IllegalArgumentException if table is not on the approved allowlist. */
  List<Map<String, Object>> readApprovedTable(String table, String orderId);

  List<String> approvedTables();
}
