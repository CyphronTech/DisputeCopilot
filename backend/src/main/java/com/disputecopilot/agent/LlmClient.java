package com.disputecopilot.agent;

public interface LlmClient {
  String chat(String system, String user);
}
