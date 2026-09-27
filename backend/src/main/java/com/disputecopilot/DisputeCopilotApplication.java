package com.disputecopilot;

import com.disputecopilot.setup.SplashScreen;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DisputeCopilotApplication {

  public static void main(String[] args) {
    SplashScreen.showIfBundled();
    SpringApplication.run(DisputeCopilotApplication.class, args);
  }
}
