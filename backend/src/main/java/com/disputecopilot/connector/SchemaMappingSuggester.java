package com.disputecopilot.connector;

import com.disputecopilot.agent.LlmClientFactory;
import com.disputecopilot.setup.ModelConfigEntity;
import com.disputecopilot.setup.ModelConfigJpaRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

/**
 * Suggests which of a merchant's real tables/columns play the five roles this app needs
 * (orders, payments, fulfillment, refunds, communications), and which column in each holds
 * the order identifier. Only ever sees table/column NAMES from schema discovery, never row
 * data. Every suggestion is checked against the real discovered schema before being returned
 * — a hallucinated table or column name is dropped, not surfaced — and the admin still has to
 * review and click Save before any of this is used to read the merchant database.
 */
@Service
public class SchemaMappingSuggester {

  private static final List<String> ROLES = List.of("orders", "payments", "fulfillment", "refunds", "communications");

  private static final String SYSTEM_PROMPT = """
      You map a merchant's database schema to the fixed roles a dispute-resolution app needs:
      orders, payments, fulfillment, refunds, communications. For each role, pick the single
      best-matching table from the list given to you and the column in that table that holds
      the order identifier (the value used to look up all other tables for the same order).
      If no table clearly fits a role, omit that role entirely. Never invent a table or column
      name that isn't in the list you were given.

      Respond with ONLY a JSON object, no markdown fences, no prose:
      {"orders": {"table": "...", "orderIdColumn": "..."}, "payments": {...}, ...}
      Omit any role you can't confidently map.
      """;

  private final ModelConfigJpaRepository modelConfigs;
  private final LlmClientFactory clientFactory;
  private final ObjectMapper json = new ObjectMapper();

  public SchemaMappingSuggester(ModelConfigJpaRepository modelConfigs, LlmClientFactory clientFactory) {
    this.modelConfigs = modelConfigs;
    this.clientFactory = clientFactory;
  }

  public Map<String, TableRoleMappingStore.RoleMapping> suggest(Map<String, List<String>> schema) {
    ModelConfigEntity config = modelConfigs.findById(Boolean.TRUE)
        .orElseThrow(() -> new NoSuchElementException("No model provider configured yet — set one up in Setup first."));

    StringBuilder schemaText = new StringBuilder("Tables and columns:\n");
    schema.forEach((table, columns) -> schemaText.append("- ").append(table).append(": ").append(String.join(", ", columns)).append('\n'));

    String raw = clientFactory.forConfig(config).chat(SYSTEM_PROMPT, schemaText.toString());
    return parseAndValidate(raw, schema);
  }

  private Map<String, TableRoleMappingStore.RoleMapping> parseAndValidate(String raw, Map<String, List<String>> schema) {
    String cleaned = raw.strip().replaceAll("^```json|^```|```$", "").strip();
    Map<String, TableRoleMappingStore.RoleMapping> result = new LinkedHashMap<>();
    try {
      JsonNode root = json.readTree(cleaned);
      for (String role : ROLES) {
        JsonNode node = root.path(role);
        if (!node.isObject()) continue;
        String table = node.path("table").asText("");
        String column = node.path("orderIdColumn").asText("");
        List<String> columns = schema.get(table);
        if (columns != null && columns.contains(column)) {
          result.put(role, new TableRoleMappingStore.RoleMapping(table, column));
        }
      }
      return result;
    } catch (Exception e) {
      throw new IllegalStateException("Could not parse mapping suggestion: " + raw, e);
    }
  }
}
