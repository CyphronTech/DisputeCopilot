package com.disputecopilot.setup;

import java.awt.Color;
import java.awt.Desktop;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.MenuItem;
import java.awt.PopupMenu;
import java.awt.RenderingHints;
import java.awt.SystemTray;
import java.awt.TrayIcon;
import java.awt.image.BufferedImage;
import java.net.URI;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Desktop integration for the packaged build (see the "bundled" profile): opens the browser to
 * the app on startup, and adds a system tray icon with Open/Quit. This is a windowless server
 * process — without a tray icon, a user's only way to stop it is hunting through Task Manager.
 * Both are best-effort: if there's no desktop/tray support, the server still runs fine either way.
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
    String url = "http://localhost:" + environment.getProperty("local.server.port", "8080");
    openBrowser(url);
    addTrayIcon(url, event.getApplicationContext());
  }

  private void openBrowser(String url) {
    try {
      if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
        Desktop.getDesktop().browse(URI.create(url));
      }
    } catch (Exception ignored) {
      // Best-effort — the app is fully usable at that URL either way.
    }
  }

  private void addTrayIcon(String url, ConfigurableApplicationContext context) {
    try {
      if (!SystemTray.isSupported()) return;
      TrayIcon trayIcon = new TrayIcon(brandIcon(), "DisputeCopilot");
      trayIcon.setImageAutoSize(true);

      PopupMenu menu = new PopupMenu();
      MenuItem open = new MenuItem("Open DisputeCopilot");
      open.addActionListener(e -> openBrowser(url));
      MenuItem quit = new MenuItem("Quit");
      quit.addActionListener(e -> {
        context.close();
        System.exit(0);
      });
      menu.add(open);
      menu.add(quit);

      trayIcon.setPopupMenu(menu);
      trayIcon.addActionListener(e -> openBrowser(url));
      SystemTray.getSystemTray().add(trayIcon);
    } catch (Exception ignored) {
      // Best-effort — no tray icon just means closing it needs Task Manager, same as before.
    }
  }

  /** Small "DC" badge matching the app's own brand mark — generated so we don't ship a separate icon asset. */
  private Image brandIcon() {
    int size = 16;
    BufferedImage image = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
    Graphics2D g = image.createGraphics();
    g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    g.setColor(new Color(0x2F, 0x6F, 0xE0));
    g.fillRoundRect(0, 0, size, size, 5, 5);
    g.setColor(Color.WHITE);
    g.setFont(new Font("SansSerif", Font.BOLD, 9));
    g.drawString("DC", 1, 12);
    g.dispose();
    return image;
  }
}
