package com.disputecopilot;

import com.disputecopilot.setup.DesktopRuntime;
import com.disputecopilot.setup.LocalSecretKey;
import com.disputecopilot.setup.SplashScreen;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DisputeCopilotApplication {

  public static void main(String[] args) {
    SplashScreen.showIfBundled();
    try {
      if (DesktopRuntime.isBundled()) {
        if (!DesktopRuntime.claimSingleInstance()) {
          SplashScreen.close();
          System.exit(0);
        }
        DesktopRuntime.choosePorts();
      }
      LocalSecretKey.initialiseIfBundled();
      SpringApplication.run(DisputeCopilotApplication.class, args);
    } catch (Throwable startupFailure) {
      // Showing the splash creates a non-daemon AWT thread that would otherwise keep this
      // process alive forever — with no window and no console — if startup throws.
      SplashScreen.close();
      if (DesktopRuntime.isBundled()) DesktopRuntime.reportStartupFailure(startupFailure);
      System.exit(1);
    }
  }
}
