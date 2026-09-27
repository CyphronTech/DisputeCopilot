package com.disputecopilot.setup;

import java.awt.Desktop;
import java.net.URI;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Opens the user's default browser to the app once it's ready — only for the packaged desktop
 * build (see the "bundled" profile). A client double-clicking the installed app shouldn't have
 * to know it's a local web server or type a URL. Best-effort: if there's no desktop/browser
 * support (unusual for a desktop install), it just doesn't open one — the server still runs.
 */
@Component
@Profile("bundled")
public class BrowserLauncher implements ApplicationListener<ApplicationReadyEvent> {

  private final Environment environment;

  public BrowserLauncher(Environment environment) {
    this.environment = environment;
  }

  @Override
  public void onApplicationEvent(ApplicationReadyEvent event) {
    String port = environment.getProperty("local.server.port", "8080");
    try {
      if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
        Desktop.getDesktop().browse(URI.create("http://localhost:" + port));
      }
    } catch (Exception ignored) {
      // Best-effort — the app is fully usable at that URL either way.
    }
  }
}
