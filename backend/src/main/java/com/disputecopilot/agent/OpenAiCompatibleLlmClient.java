package com.disputecopilot.agent;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.Builder;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/** Used for both "openai" and "local" providers — any server exposing the /chat/completions shape. */
class OpenAiCompatibleLlmClient implements LlmClient {

  private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
  private static final ObjectMapper JSON = new ObjectMapper();

  private final String baseUrl;
  private final String apiKey;
  private final String model;

  OpenAiCompatibleLlmClient(String baseUrl, String apiKey, String model) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  @Override
  public String chat(String system, String user) {
    try {
      String body = JSON.writeValueAsString(Map.of(
          "model", model,
          "messages", new Object[] {
              Map.of("role", "system", "content", system),
              Map.of("role", "user", "content", user)
          }));
      Builder builder = HttpRequest.newBuilder(URI.create(baseUrl + "/chat/completions"))
          .header("content-type", "application/json")
          .timeout(Duration.ofSeconds(60))
          .POST(HttpRequest.BodyPublishers.ofString(body));
      if (apiKey != null && !apiKey.isBlank()) {
        builder.header("authorization", "Bearer " + apiKey);
      }
      HttpResponse<String> response = HTTP.send(builder.build(), HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 300) {
        throw new IllegalStateException("Model API error " + response.statusCode() + ": " + response.body());
      }
      JsonNode root = JSON.readTree(response.body());
      return root.path("choices").path(0).path("message").path("content").asText();
    } catch (Exception e) {
      throw new IllegalStateException("Model call failed: " + e.getMessage(), e);
    }
  }
}
