package com.disputecopilot.agent;

import com.disputecopilot.casework.persistence.EvidenceItemEntity;
import com.disputecopilot.policy.PolicyDocumentEntity;
import com.disputecopilot.policy.PolicyRetrievalService;
import com.disputecopilot.setup.ModelConfigEntity;
import com.disputecopilot.setup.ModelConfigJpaRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Component;

/**
 * One-shot evidence + policy review. Policy retrieval is keyword-overlap scoring, not
 * embeddings (see PolicyRetrievalService) — a real but bounded RAG step, not full semantic
 * search. Every citation the model returns is checked against the source document's stored
 * text before being accepted (architecture.md "Policy claims -> source text").
 */
@Component
public class EvidenceReviewAgent {

  private static final String SYSTEM_PROMPT = """
      You review evidence for a "product not received" chargeback dispute so a merchant can \
      decide whether to contest it. You never accuse the customer of fraud or lying; you only \
      judge whether the merchant's own records and policy support contesting the dispute.

      Evidence rows are either "ok" (a record was found), "gap" (no record found for that \
      table, e.g. no refund on file), or "communication" (a message from the customer).

      You are given excerpts from the merchant's policy documents. If a policy excerpt is \
      relevant to your recommendation, cite it by copying a short quote EXACTLY as written in \
      the excerpt (do not paraphrase) into the citations array, with the matching document title.

      Also write a "summary": 2-3 plain-English sentences a non-technical shop owner could read \
      and immediately understand, with no jargon (no "evidence rows", "gap", "citation", table \
      names, or JSON-speak). State what the customer ordered, what the records show happened, \
      and why you're making this recommendation.

      Respond with ONLY a JSON object, no markdown fences, no prose:
      {"recommendation": "CONTEST" | "ACCEPT" | "MANUAL_REVIEW_REQUIRED", "confidence": 0.0-1.0, \
      "caveat": "short string or null", "summary": "2-3 plain-English sentences", \
      "citations": [{"documentTitle": "...", "quote": "exact substring from that document"}]}

      Guidance: CONTEST when fulfillment evidence exists and no refund was issued. ACCEPT when \
      a refund was already issued. If there's a separate open return/RMA request (not yet \
      approved, rejected, or resolved) with no refund issued yet, treat that as unresolved \
      evidence, not as "no dispute raised" — lean toward MANUAL_REVIEW_REQUIRED and say so in \
      the caveat rather than confidently contesting. MANUAL_REVIEW_REQUIRED when evidence is \
      missing, conflicting, or you are not confident — set confidence low and explain why in \
      caveat. In the summary, always state in plain words whether the merchant should refund the \
      customer or not, not just whether to contest. Omit citations entirely (empty array) if no \
      policy excerpt is actually relevant.
      """;

  private final ModelConfigJpaRepository modelConfigs;
  private final LlmClientFactory clientFactory;
  private final PolicyRetrievalService policyRetrieval;
  private final ObjectMapper json = new ObjectMapper();

  public EvidenceReviewAgent(ModelConfigJpaRepository modelConfigs, LlmClientFactory clientFactory, PolicyRetrievalService policyRetrieval) {
    this.modelConfigs = modelConfigs;
    this.clientFactory = clientFactory;
    this.policyRetrieval = policyRetrieval;
  }

  public record Citation(String documentId, String title, String version, String quote) {}
  public record Review(String recommendation, double confidence, String caveat, String summary, List<Citation> citations) {}

  public Review review(String orderId, List<EvidenceItemEntity> evidence) {
    ModelConfigEntity config = modelConfigs.findById(Boolean.TRUE)
        .orElseThrow(() -> new NoSuchElementException("No model provider configured yet — set one up in Setup."));

    StringBuilder evidenceText = new StringBuilder("Order: ").append(orderId).append("\nEvidence:\n");
    for (EvidenceItemEntity item : evidence) {
      evidenceText.append("- [").append(item.getKind()).append("] ").append(item.getTitle())
          .append(": ").append(item.getDescription()).append('\n');
    }

    List<PolicyRetrievalService.Match> matches = policyRetrieval.topMatches(evidenceText.toString(), 2);
    StringBuilder prompt = new StringBuilder(evidenceText);
    if (matches.isEmpty()) {
      prompt.append("\nNo policy documents matched this case. Do not fabricate a citation.\n");
    } else {
      prompt.append("\nRelevant policy excerpts:\n");
      for (PolicyRetrievalService.Match match : matches) {
        prompt.append("=== ").append(match.document().getTitle()).append(" ===\n")
            .append(match.document().getContent()).append("\n\n");
      }
    }

    String raw = clientFactory.forConfig(config).chat(SYSTEM_PROMPT, prompt.toString());
    return parse(raw, matches);
  }

  private Review parse(String raw, List<PolicyRetrievalService.Match> matches) {
    String cleaned = raw.strip().replaceAll("^```json|^```|```$", "").strip();
    try {
      JsonNode node = json.readTree(cleaned);
      String recommendation = node.path("recommendation").asText().trim().toUpperCase(java.util.Locale.ROOT);
      double confidence = Math.clamp(node.path("confidence").asDouble(0.0), 0.0, 1.0);
      String caveat = node.hasNonNull("caveat") ? node.path("caveat").asText() : null;
      String summary = node.hasNonNull("summary") ? node.path("summary").asText() : null;
      if (!recommendation.equals("CONTEST") && !recommendation.equals("ACCEPT") && !recommendation.equals("MANUAL_REVIEW_REQUIRED")) {
        throw new IllegalArgumentException("Unexpected recommendation value: " + recommendation);
      }
      List<Citation> citations = verifiedCitations(node.path("citations"), matches);
      return new Review(recommendation, confidence, caveat, summary, citations);
    } catch (Exception e) {
      throw new IllegalStateException("Could not parse model response as the expected JSON: " + raw, e);
    }
  }

  private List<Citation> verifiedCitations(JsonNode citationsNode, List<PolicyRetrievalService.Match> matches) {
    List<Citation> verified = new ArrayList<>();
    if (!citationsNode.isArray()) return verified;
    for (JsonNode citationNode : citationsNode) {
      String documentTitle = citationNode.path("documentTitle").asText("");
      String quote = citationNode.path("quote").asText("");
      matches.stream()
          .map(PolicyRetrievalService.Match::document)
          .filter(doc -> doc.getTitle().equalsIgnoreCase(documentTitle))
          .filter(doc -> !quote.isBlank() && doc.getContent().contains(quote))
          .findFirst()
          .ifPresent(doc -> verified.add(new Citation(doc.getId().toString(), doc.getTitle(), doc.getVersion(), quote)));
    }
    return verified;
  }
}
