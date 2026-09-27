package com.disputecopilot.setup;

import com.disputecopilot.agent.LlmClientFactory;
import com.disputecopilot.audit.AuditRecorder;
import com.disputecopilot.setup.SetupDtos.ModelConfigView;
import com.disputecopilot.setup.SetupDtos.SaveModelConfigRequest;
import com.disputecopilot.setup.SetupDtos.TestResult;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.NoSuchElementException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/setup/model")
public class SetupController {

  private final ModelConfigJpaRepository repository;
  private final LlmClientFactory clientFactory;
  private final CryptoUtil crypto;
  private final AuditRecorder audit;

  public SetupController(ModelConfigJpaRepository repository, LlmClientFactory clientFactory, CryptoUtil crypto, AuditRecorder audit) {
    this.repository = repository;
    this.clientFactory = clientFactory;
    this.crypto = crypto;
    this.audit = audit;
  }

  @GetMapping
  public ModelConfigView get() {
    return repository.findById(Boolean.TRUE).map(this::toView)
        .orElse(new ModelConfigView(null, null, null, null, null));
  }

  @PutMapping
  public ModelConfigView save(@Valid @RequestBody SaveModelConfigRequest request) {
    ModelConfigEntity existing = repository.findById(Boolean.TRUE).orElse(null);
    String apiKey = (request.apiKey() == null || request.apiKey().isBlank()) && existing != null
        ? existing.getApiKey() : crypto.encrypt(request.apiKey());
    ModelConfigEntity entity = new ModelConfigEntity(request.provider(), request.baseUrl(), apiKey, request.model());
    audit.record("Model configuration updated", request.provider() + " · " + request.model(), null, "Admin", false, "setup", "neutral");
    return toView(repository.save(entity));
  }

  @PostMapping("/test")
  public TestResult test() {
    ModelConfigEntity config = repository.findById(Boolean.TRUE)
        .orElseThrow(() -> new NoSuchElementException("Save a model configuration first."));
    try {
      clientFactory.forConfig(config).chat("Reply with exactly: ok", "ping");
      config.setLastTestedAt(Instant.now());
      repository.save(config);
      return new TestResult(true, "Connected");
    } catch (Exception e) {
      return new TestResult(false, e.getMessage());
    }
  }

  private ModelConfigView toView(ModelConfigEntity e) {
    return new ModelConfigView(e.getProvider(), e.getBaseUrl(), maskedKey(e.getApiKey()), e.getModel(), e.getLastTestedAt());
  }

  /**
   * A key encrypted under a different secret (restored backup, cleared secret.key) can't be
   * read back. That must not take the whole Setup page down with it — the admin needs to reach
   * this page precisely so they can re-enter the key.
   */
  private String maskedKey(String stored) {
    try {
      String apiKey = crypto.decrypt(stored);
      return apiKey == null || apiKey.length() < 4 ? null : "••••" + apiKey.substring(apiKey.length() - 4);
    } catch (RuntimeException unreadable) {
      return "unreadable — re-enter your key";
    }
  }
}
