package com.disputecopilot.policy;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * ponytail: retrieval is keyword-overlap scoring, not embeddings — no pgvector/chunking
 * pipeline exists yet. Good enough to hand the agent the 1-2 most relevant policy documents
 * out of a handful of seed documents; upgrade to semantic (pgvector) search once the policy
 * library holds more than a few documents and keyword overlap stops being discriminating.
 */
@Service
public class PolicyRetrievalService {

  private static final Set<String> STOPWORDS = Set.of(
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of", "in", "on", "for",
      "and", "or", "if", "this", "that", "it", "as", "at", "by", "with", "from", "has", "have",
      "had", "not", "no", "you", "your", "we", "will", "can", "may", "within", "into");

  private final PolicyDocumentJpaRepository repository;

  public PolicyRetrievalService(PolicyDocumentJpaRepository repository) {
    this.repository = repository;
  }

  public record Match(PolicyDocumentEntity document, int score) {}

  public List<Match> topMatches(String queryText, int limit) {
    Set<String> queryWords = words(queryText);
    return repository.findAllByStatus("ACTIVE").stream()
        .map(doc -> new Match(doc, overlapScore(queryWords, words(doc.getContent()))))
        .filter(m -> m.score() > 0)
        .sorted(Comparator.comparingInt(Match::score).reversed())
        .limit(limit)
        .toList();
  }

  private int overlapScore(Set<String> queryWords, Set<String> docWords) {
    return (int) queryWords.stream().filter(docWords::contains).count();
  }

  private Set<String> words(String text) {
    return Arrays.stream(text.toLowerCase().split("[^a-z0-9]+"))
        .filter(w -> w.length() > 3 && !STOPWORDS.contains(w))
        .collect(java.util.stream.Collectors.toSet());
  }
}
