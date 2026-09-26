package com.disputecopilot.agent;

import com.disputecopilot.setup.CryptoUtil;
import com.disputecopilot.setup.ModelConfigEntity;
import org.springframework.stereotype.Component;

@Component
public class LlmClientFactory {

  private final CryptoUtil crypto;

  public LlmClientFactory(CryptoUtil crypto) {
    this.crypto = crypto;
  }

  public LlmClient forConfig(ModelConfigEntity config) {
    String apiKey = crypto.decrypt(config.getApiKey());
    return switch (config.getProvider()) {
      case "anthropic" -> new AnthropicLlmClient(config.getBaseUrl(), apiKey, config.getModel());
      case "openai", "local" -> new OpenAiCompatibleLlmClient(config.getBaseUrl(), apiKey, config.getModel());
      default -> throw new IllegalArgumentException("Unknown model provider: " + config.getProvider());
    };
  }
}
