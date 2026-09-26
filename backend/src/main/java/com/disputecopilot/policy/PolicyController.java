package com.disputecopilot.policy;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/policies")
public class PolicyController {

  private final PolicyDocumentJpaRepository repository;

  public PolicyController(PolicyDocumentJpaRepository repository) {
    this.repository = repository;
  }

  public record VersionView(String version, String status, LocalDate effectiveFrom, LocalDate effectiveTo) {}
  public record PolicyDocumentView(
      String documentId, String title, String filename, String version, String status,
      LocalDate effectiveFrom, LocalDate effectiveTo, List<VersionView> versions) {}

  @GetMapping
  public List<PolicyDocumentView> list() {
    return repository.findAll().stream().map(this::toView).toList();
  }

  @PostMapping(consumes = "multipart/form-data")
  public PolicyDocumentView upload(@RequestParam("file") MultipartFile file, @RequestParam(value = "title", required = false) String title) throws IOException {
    if (file.isEmpty()) {
      throw new IllegalArgumentException("File is empty");
    }
    String filename = file.getOriginalFilename() == null ? "policy.txt" : file.getOriginalFilename();
    String content = extractText(file, filename);
    String docTitle = (title == null || title.isBlank()) ? filename : title;
    PolicyDocumentEntity entity = new PolicyDocumentEntity(
        UUID.randomUUID(), docTitle, filename, "1.0", "ACTIVE", LocalDate.now(), null, content);
    return toView(repository.save(entity));
  }

  private String extractText(MultipartFile file, String filename) throws IOException {
    if (filename.toLowerCase().endsWith(".pdf")) {
      try (var document = Loader.loadPDF(file.getBytes())) {
        return new PDFTextStripper().getText(document);
      }
    }
    return new String(file.getBytes(), StandardCharsets.UTF_8);
  }

  private PolicyDocumentView toView(PolicyDocumentEntity e) {
    VersionView version = new VersionView(e.getVersion(), e.getStatus(), e.getEffectiveFrom(), e.getEffectiveTo());
    return new PolicyDocumentView(e.getId().toString(), e.getTitle(), e.getFilename(), e.getVersion(), e.getStatus(), e.getEffectiveFrom(), e.getEffectiveTo(), List.of(version));
  }
}
