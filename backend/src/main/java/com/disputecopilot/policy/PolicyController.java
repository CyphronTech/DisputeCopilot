package com.disputecopilot.policy;

import com.disputecopilot.audit.AuditRecorder;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/policies")
public class PolicyController {

  private final PolicyDocumentJpaRepository repository;
  private final AuditRecorder audit;

  public PolicyController(PolicyDocumentJpaRepository repository, AuditRecorder audit) {
    this.repository = repository;
    this.audit = audit;
  }

  public record VersionView(String version, String status, LocalDate effectiveFrom, LocalDate effectiveTo) {}
  public record PolicyDocumentView(
      String documentId, String title, String filename, String version, String status,
      LocalDate effectiveFrom, LocalDate effectiveTo, List<VersionView> versions) {}

  @GetMapping
  public List<PolicyDocumentView> list() {
    return repository.findAll().stream().filter(d -> !"RETIRED".equals(d.getStatus())).map(this::toView).toList();
  }

  @PostMapping(consumes = "multipart/form-data")
  public PolicyDocumentView upload(@RequestParam("file") MultipartFile file, @RequestParam(value = "title", required = false) String title) throws IOException {
    if (file.isEmpty()) {
      throw new IllegalArgumentException("File is empty");
    }
    String filename = file.getOriginalFilename() == null ? "policy.txt" : file.getOriginalFilename();
    String content = extractText(file, filename);
    if (content.isBlank()) {
      throw new IllegalArgumentException("No readable text was found in " + filename + " — a scanned image PDF won't work, it needs selectable text.");
    }
    String docTitle = (title == null || title.isBlank()) ? filename : title;
    PolicyDocumentEntity entity = new PolicyDocumentEntity(
        UUID.randomUUID(), docTitle, filename, "1.0", "ACTIVE", LocalDate.now(), null, content);
    PolicyDocumentView saved = toView(repository.save(entity));
    audit.record("Policy document uploaded", docTitle, null, "Admin", false, "file", "neutral");
    return saved;
  }

  @DeleteMapping("/{documentId}")
  public void delete(@PathVariable String documentId) {
    PolicyDocumentEntity entity = repository.findById(UUID.fromString(documentId))
        .orElseThrow(() -> new NoSuchElementException("No such policy document"));
    // Soft delete: a hard delete fails once any case has cited this document (case_citation
    // references it), which left outdated policies impossible to remove.
    entity.retire();
    repository.save(entity);
    audit.record("Policy document removed", entity.getTitle(), null, "Admin", false, "file", "warn");
  }

  /**
   * Only formats we can actually turn into text. Decoding a .docx or .xlsx as UTF-8 would
   * "succeed" and store mojibake, which then gets fed to the model as if it were policy.
   */
  private String extractText(MultipartFile file, String filename) throws IOException {
    String lower = filename.toLowerCase();
    if (lower.endsWith(".pdf")) {
      try (var document = Loader.loadPDF(file.getBytes())) {
        return new PDFTextStripper().getText(document);
      }
    }
    if (lower.endsWith(".txt") || lower.endsWith(".md")) {
      return new String(file.getBytes(), StandardCharsets.UTF_8);
    }
    throw new IllegalArgumentException("Unsupported file type — upload a PDF, TXT or MD policy document.");
  }

  private PolicyDocumentView toView(PolicyDocumentEntity e) {
    VersionView version = new VersionView(e.getVersion(), e.getStatus(), e.getEffectiveFrom(), e.getEffectiveTo());
    return new PolicyDocumentView(e.getId().toString(), e.getTitle(), e.getFilename(), e.getVersion(), e.getStatus(), e.getEffectiveFrom(), e.getEffectiveTo(), List.of(version));
  }
}
