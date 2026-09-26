package com.disputecopilot.setup;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public final class SetupDtos {
  private SetupDtos() {}

  public record ModelConfigView(String provider, String baseUrl, String maskedKey, String model, Instant lastTestedAt) {}

  public record SaveModelConfigRequest(@NotBlank String provider, @NotBlank String baseUrl, String apiKey, @NotBlank String model) {}

  public record TestResult(boolean ok, String message) {}
}
