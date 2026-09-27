package com.disputecopilot.agent;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.time.Duration;
import java.util.Map;

class AnthropicLlmClient implements LlmClient {

  private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
  private static final ObjectMapper JSON = new ObjectMapper();

  private final String baseUrl;
  private final String apiKey;
  private final String model;

  AnthropicLlmClient(String baseUrl, String apiKey, String model) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  @Override
  public String chat(String system, String user) {
    try {
      String body = JSON.writeValueAsString(Map.of(
          "model", model,
          // Generous headroom: a truncated response is not partially useful, it fails to parse
          // outright, and unused tokens cost nothing.
          "max_tokens", 4096,
          "system", system,
          "messages", new Object[] { Map.of("role", "user", "content", user) }));
      HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/v1/messages"))
          .header("content-type", "application/json")
          .header("x-api-key", apiKey)
          .header("anthropic-version", "2023-06-01")
          .timeout(Duration.ofSeconds(120))
          .POST(HttpRequest.BodyPublishers.ofString(body))
          .build();
      JsonNode root = JSON.readTree(LlmClient.send(HTTP, request));
      return root.path("content").path(0).path("text").asText();
    } catch (IllegalStateException e) {
      throw e;
    } catch (Exception e) {
      throw new IllegalStateException("The AI request failed: " + e.getMessage(), e);
    }
  }
}
