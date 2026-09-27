package com.disputecopilot.agent;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;

public interface LlmClient {
  String chat(String system, String user);

  /**
   * Models routinely wrap a JSON reply in ``` fences or add a line of prose before it despite
   * being told not to. Taking the outermost braces tolerates that instead of failing the whole
   * operation over packaging.
   */
  static String extractJsonObject(String raw) {
    String text = raw == null ? "" : raw.strip();
    int start = text.indexOf('{');
    int end = text.lastIndexOf('}');
    return start >= 0 && end > start ? text.substring(start, end + 1) : text;
  }

  /**
   * Sends the request and returns the reply body, retrying rate limits (429) and provider outages
   * (5xx) that usually clear within seconds. Every failure becomes a message a shop owner can act
   * on — the raw provider response is not shown, it means nothing to them.
   */
  static String send(HttpClient http, HttpRequest request) {
    try {
      HttpResponse<String> response = null;
      for (int attempt = 1; attempt <= 3; attempt++) {
        response = http.send(request, HttpResponse.BodyHandlers.ofString());
        int status = response.statusCode();
        if (status != 429 && status < 500) break;
        if (attempt < 3) Thread.sleep(attempt * 3000L);
      }
      if (response.statusCode() >= 300) throw new IllegalStateException(friendlyError(response.statusCode()));
      return response.body();
    } catch (HttpTimeoutException e) {
      throw new IllegalStateException("Your AI provider took too long to answer. Try again in a minute.", e);
    } catch (IOException e) {
      throw new IllegalStateException("Couldn't reach your AI provider. Check your internet connection and the address in Setup.", e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("The AI request was interrupted.", e);
    }
  }

  static String friendlyError(int status) {
    return switch (status) {
      case 401, 403 -> "Your AI provider rejected the API key. Check the key in Setup.";
      case 404 -> "Your AI provider didn't recognise the model name. Check the model in Setup.";
      case 429 -> "Your AI provider is limiting requests, or your account is out of credit. Wait a minute and try again, or check your plan.";
      default -> status >= 500
          ? "Your AI provider is having problems right now. Try again in a few minutes."
          : "Your AI provider refused the request (error " + status + "). Check your account and the settings in Setup.";
    };
  }
}
