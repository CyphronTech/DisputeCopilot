package com.disputecopilot.connector;

import com.disputecopilot.audit.AuditRecorder;
import com.disputecopilot.setup.CryptoUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/setup/shopify")
public class ShopifySetupController {

  private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  private final ShopifyConfigJpaRepository repository;
  private final CryptoUtil crypto;
  private final AuditRecorder audit;

  public ShopifySetupController(ShopifyConfigJpaRepository repository, CryptoUtil crypto, AuditRecorder audit) {
    this.repository = repository;
    this.crypto = crypto;
    this.audit = audit;
  }

  public record SaveShopifyRequest(@NotBlank String shopDomain, String accessToken) {}
  public record ShopifyView(boolean configured, String shopDomain, Instant lastTestedAt) {}
  public record TestResult(boolean ok, String message) {}

  @GetMapping
  public ShopifyView get() {
    return repository.findById(Boolean.TRUE)
        .map(c -> new ShopifyView(true, c.getShopDomain(), c.getLastTestedAt()))
        .orElse(new ShopifyView(false, null, null));
  }

  @PutMapping
  public ShopifyView save(@Valid @RequestBody SaveShopifyRequest request) {
    ShopifyConfigEntity existing = repository.findById(Boolean.TRUE).orElse(null);
    String token = (request.accessToken() == null || request.accessToken().isBlank()) && existing != null
        ? existing.getAccessToken() : crypto.encrypt(request.accessToken());
    if (token == null || token.isBlank()) {
      throw new IllegalArgumentException("An access token is required");
    }
    String domain = normalizeDomain(request.shopDomain());
    repository.save(new ShopifyConfigEntity(domain, token));
    audit.record("Shopify connector updated", domain, null, "Admin", false, "setup", "neutral");
    return get();
  }

  @PostMapping("/test")
  public TestResult test() {
    ShopifyConfigEntity config = repository.findById(Boolean.TRUE).orElse(null);
    if (config == null) return new TestResult(false, "Save a shop domain and access token first.");
    try {
      HttpRequest request = HttpRequest.newBuilder(URI.create("https://" + config.getShopDomain() + "/admin/api/2024-01/shop.json"))
          .header("X-Shopify-Access-Token", crypto.decrypt(config.getAccessToken()))
          .timeout(Duration.ofSeconds(15))
          .GET().build();
      HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 300) {
        return new TestResult(false, "Shopify responded with " + response.statusCode() + " — check the domain and access token.");
      }
      config.setLastTestedAt(Instant.now());
      repository.save(config);
      return new TestResult(true, "Connected");
    } catch (Exception e) {
      return new TestResult(false, e.getMessage());
    }
  }

  private String normalizeDomain(String input) {
    String domain = input.trim().replaceFirst("^https?://", "").replaceAll("/$", "");
    return domain.endsWith(".myshopify.com") ? domain : domain + ".myshopify.com";
  }
}
