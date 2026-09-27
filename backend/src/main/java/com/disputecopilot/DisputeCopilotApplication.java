package com.disputecopilot;

import com.disputecopilot.setup.SplashScreen;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DisputeCopilotApplication {

  public static void main(String[] args) {
    SplashScreen.showIfBundled();
    try {
      SpringApplication.run(DisputeCopilotApplication.class, args);
    } catch (Throwable startupFailure) {
      // Showing the splash creates a non-daemon AWT thread that would otherwise keep this
      // process alive forever — with no window and no console — if startup throws. The
      // exception is already in the bundled-profile log file (see application-bundled.yml);
      // this just makes sure the process actually exits instead of hanging silently.
      SplashScreen.close();
      System.exit(1);
    }
  }
}
