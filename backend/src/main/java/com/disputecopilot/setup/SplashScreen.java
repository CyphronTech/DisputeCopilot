package com.disputecopilot.setup;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Image;
import java.awt.Toolkit;
import javax.swing.BorderFactory;
import javax.swing.ImageIcon;
import javax.swing.JLabel;
import javax.swing.JWindow;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;

/**
 * Shown the instant the packaged app's JVM starts, closed once the browser tab opens — otherwise
 * double-clicking the exe gives no feedback for the several seconds Spring Boot + embedded
 * Postgres take to come up. Only used in the "bundled" profile; checked via a system property
 * (set by jpackage's --java-options) rather than Spring's Environment because it has to run
 * before the Spring context exists at all.
 */
public final class SplashScreen {

  private static JWindow window;

  private SplashScreen() {}

  public static void showIfBundled() {
    if (!"bundled".equals(System.getProperty("spring.profiles.active"))) return;
    try {
      SwingUtilities.invokeAndWait(SplashScreen::build);
    } catch (Exception ignored) {
      // Best-effort — a missing splash never blocks startup.
    }
  }

  private static void build() {
    JWindow w = new JWindow();
    w.getContentPane().setBackground(Color.WHITE);

    JLabel icon = new JLabel();
    icon.setHorizontalAlignment(SwingConstants.CENTER);
    icon.setBorder(BorderFactory.createEmptyBorder(36, 0, 12, 0));
    Image logo = new ImageIcon(SplashScreen.class.getResource("/branding/logo.png")).getImage();
    icon.setIcon(new ImageIcon(logo.getScaledInstance(64, 64, Image.SCALE_SMOOTH)));

    JLabel text = new JLabel("Starting DisputeCopilot…", SwingConstants.CENTER);
    text.setFont(new Font("SansSerif", Font.PLAIN, 13));
    text.setForeground(new Color(0x56, 0x5c, 0x6b));
    text.setBorder(BorderFactory.createEmptyBorder(0, 0, 32, 0));

    w.add(icon, java.awt.BorderLayout.CENTER);
    w.add(text, java.awt.BorderLayout.SOUTH);
    w.setSize(new Dimension(260, 180));
    w.setLocationRelativeTo(null);
    Dimension screen = Toolkit.getDefaultToolkit().getScreenSize();
    w.setLocation((screen.width - w.getWidth()) / 2, (screen.height - w.getHeight()) / 2);
    w.setAlwaysOnTop(true);
    w.setVisible(true);
    window = w;
  }

  public static void close() {
    if (window == null) return;
    SwingUtilities.invokeLater(() -> {
      window.dispose();
      window = null;
    });
  }
}
