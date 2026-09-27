package com.disputecopilot.agent;

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
}
