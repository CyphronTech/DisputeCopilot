package com.disputecopilot.agent;

import com.disputecopilot.casework.persistence.EvidenceItemEntity;
import com.disputecopilot.setup.ModelConfigEntity;
import com.disputecopilot.setup.ModelConfigJpaRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Component;

/**
 * One-shot evidence review: no citations yet (no policy documents are ingested anywhere
 * in the system), so this judges evidence completeness only — see docs/architecture.md
 * "Schema discovery and the bounded read tool" for what evidence looks like.
 */
@Component
public class EvidenceReviewAgent {

  private static final String SYSTEM_PROMPT = """
      You review evidence for a "product not received" chargeback dispute so a merchant can \
      decide whether to contest it. You never accuse the customer of fraud or lying; you only \
      judge whether the merchant's own records support contesting the dispute.

      Evidence rows are either "ok" (a record was found), "gap" (no record found for that \
      table, e.g. no refund on file), or "communication" (a message from the customer).

      Respond with ONLY a JSON object, no markdown fences, no prose:
      {"recommendation": "CONTEST" | "ACCEPT" | "MANUAL_REVIEW_REQUIRED", "confidence": 0.0-1.0, "caveat": "short string or null"}

      Guidance: CONTEST when fulfillment evidence exists and no refund was issued. ACCEPT when \
      a refund was already issued. MANUAL_REVIEW_REQUIRED when evidence is missing, conflicting, \
      or you are not confident — set confidence low and explain why in caveat.
      """;

  private final ModelConfigJpaRepository modelConfigs;
  private final LlmClientFactory clientFactory;
  private final ObjectMapper json = new ObjectMapper();

  public EvidenceReviewAgent(ModelConfigJpaRepository modelConfigs, LlmClientFactory clientFactory) {
    this.modelConfigs = modelConfigs;
    this.clientFactory = clientFactory;
  }

  public record Review(String recommendation, double confidence, String caveat) {}

  public Review review(String orderId, List<EvidenceItemEntity> evidence) {
    ModelConfigEntity config = modelConfigs.findById(Boolean.TRUE)
        .orElseThrow(() -> new NoSuchElementException("No model provider configured yet — set one up in Setup."));

    StringBuilder prompt = new StringBuilder("Order: ").append(orderId).append("\nEvidence:\n");
    for (EvidenceItemEntity item : evidence) {
      prompt.append("- [").append(item.getKind()).append("] ").append(item.getTitle())
          .append(": ").append(item.getDescription()).append('\n');
    }

    String raw = clientFactory.forConfig(config).chat(SYSTEM_PROMPT, prompt.toString());
    return parse(raw);
  }

  private Review parse(String raw) {
    String cleaned = raw.strip().replaceAll("^```json|^```|```$", "").strip();
    try {
      JsonNode node = json.readTree(cleaned);
      String recommendation = node.path("recommendation").asText();
      double confidence = node.path("confidence").asDouble();
      String caveat = node.hasNonNull("caveat") ? node.path("caveat").asText() : null;
      if (!recommendation.equals("CONTEST") && !recommendation.equals("ACCEPT") && !recommendation.equals("MANUAL_REVIEW_REQUIRED")) {
        throw new IllegalArgumentException("Unexpected recommendation value: " + recommendation);
      }
      return new Review(recommendation, confidence, caveat);
    } catch (Exception e) {
      throw new IllegalStateException("Could not parse model response as the expected JSON: " + raw, e);
    }
  }
}
