package com.disputecopilot.connector;

import com.disputecopilot.setup.CryptoUtil;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Reshapes Shopify Admin API order data into the same row-map shape the fixture/Postgres
 * connector produces (see application.yml's allowlist column names), so the evidence-review
 * agent and everything downstream works unchanged regardless of which connector is active.
 *
 * ponytail: re-fetches the order from Shopify once per table read (5 calls per case) rather
 * than caching across the read loop — fine at this volume, revisit if Shopify rate limits bite.
 */
@Component
public class ShopifyMerchantConnector {

  /**
   * Shopify retires each API version about 12 months after release and then silently serves the
   * oldest supported one instead, so response shapes can change underneath us. Bump this roughly
   * every six months.
   */
  static final String API_VERSION = "2026-04";

  private static final List<String> TABLES = List.of("orders", "fulfillment", "refunds", "communications");
  private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
  private static final ObjectMapper JSON = new ObjectMapper();

  private final ShopifyConfigJpaRepository configRepository;
  private final CryptoUtil crypto;

  public ShopifyMerchantConnector(ShopifyConfigJpaRepository configRepository, CryptoUtil crypto) {
    this.configRepository = configRepository;
    this.crypto = crypto;
  }

  public List<String> approvedTables() {
    return TABLES;
  }

  public List<Map<String, Object>> readApprovedTable(String table, String orderId) {
    JsonNode order = fetchOrder(orderId);
    if (order == null) return List.of();
    return switch (table) {
      case "orders" -> orderRow(order);
      case "fulfillment" -> fulfillmentRow(order);
      case "refunds" -> refundRow(order);
      case "communications" -> communicationRow(order);
      default -> throw new IllegalArgumentException("Table not on the approved allowlist: " + table);
    };
  }

  ShopifyConfigEntity requireConfig() {
    return configRepository.findById(Boolean.TRUE)
        .orElseThrow(() -> new IllegalStateException("Shopify is not configured yet — set it up in Setup."));
  }

  private JsonNode fetchOrder(String orderName) {
    ShopifyConfigEntity config = requireConfig();
    String name = orderName.startsWith("#") ? orderName : "#" + orderName;
    try {
      HttpRequest request = HttpRequest.newBuilder(URI.create(
              "https://" + config.getShopDomain() + "/admin/api/" + API_VERSION + "/orders.json?status=any&name=" + URLEncoder.encode(name, StandardCharsets.UTF_8)))
          .header("X-Shopify-Access-Token", crypto.decrypt(config.getAccessToken()))
          .timeout(Duration.ofSeconds(20))
          .GET().build();
      HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 300) {
        throw new IllegalStateException("Shopify API error " + response.statusCode() + ": " + response.body());
      }
      JsonNode orders = JSON.readTree(response.body()).path("orders");
      return orders.isArray() && !orders.isEmpty() ? orders.get(0) : null;
    } catch (Exception e) {
      throw new IllegalStateException("Shopify lookup failed: " + e.getMessage(), e);
    }
  }

  private List<Map<String, Object>> orderRow(JsonNode order) {
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("order_id", order.path("name").asText());
    String firstName = order.path("customer").path("first_name").asText("");
    String lastName = order.path("customer").path("last_name").asText("");
    row.put("customer_name", (firstName + " " + lastName).trim());
    row.put("customer_email", order.path("email").asText(null));
    List<String> products = new ArrayList<>();
    order.path("line_items").forEach(li -> products.add(li.path("title").asText()));
    row.put("product_name", String.join(", ", products));
    row.put("created_at", order.path("created_at").asText());
    row.put("currency", order.path("currency").asText());
    row.put("amount", order.path("total_price").asText());
    return List.of(row);
  }

  private List<Map<String, Object>> fulfillmentRow(JsonNode order) {
    JsonNode fulfillments = order.path("fulfillments");
    if (!fulfillments.isArray() || fulfillments.isEmpty()) return List.of();
    JsonNode fulfillment = fulfillments.get(0);
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("order_id", order.path("name").asText());
    row.put("carrier", fulfillment.path("tracking_company").asText(null));
    row.put("awb", fulfillment.path("tracking_number").asText(null));
    row.put("shipped_at", fulfillment.path("created_at").asText());
    return List.of(row);
  }

  private List<Map<String, Object>> refundRow(JsonNode order) {
    JsonNode refunds = order.path("refunds");
    if (!refunds.isArray() || refunds.isEmpty()) return List.of();
    // All refunds, not just the first: a partial refund followed by another must add up, or the
    // review under-states what the customer already got back.
    double total = 0;
    JsonNode refund = refunds.get(refunds.size() - 1);
    for (JsonNode each : refunds) {
      for (JsonNode transaction : each.path("transactions")) {
        total += transaction.path("amount").asDouble(0);
      }
    }
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("order_id", order.path("name").asText());
    row.put("status", "ISSUED");
    row.put("amount", total);
    row.put("decided_at", refund.path("created_at").asText());
    return List.of(row);
  }

  private List<Map<String, Object>> communicationRow(JsonNode order) {
    String note = order.path("note").asText("");
    if (note.isBlank()) return List.of();
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("order_id", order.path("name").asText());
    row.put("occurred_at", order.path("updated_at").asText());
    row.put("body", note);
    return List.of(row);
  }
}
