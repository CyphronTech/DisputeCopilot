package com.disputecopilot.setup;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import javax.swing.JDialog;
import javax.swing.JOptionPane;

/**
 * Pre-Spring housekeeping for the packaged desktop build: only one copy at a time, ports that
 * are actually free, and a visible message when things go wrong. The exe has no console, so
 * without this a second double-click or a busy port just made the splash vanish.
 */
public final class DesktopRuntime {

  private static final Path NEW_APP_DIR = Path.of(System.getProperty("user.home"), "AppData", "Local", "Proofly");
  private static final Path OLD_APP_DIR = Path.of(System.getProperty("user.home"), "AppData", "Local", "DisputeCopilot");
  public static Path APP_DIR = NEW_APP_DIR;

  /** Held (never closed) for the life of the process; the OS releases it if we crash. */
  private static FileChannel instanceLock;

  private DesktopRuntime() {}

  public static boolean isBundled() {
    return "bundled".equals(System.getProperty("spring.profiles.active"));
  }

  private static Path logFile() {
    return APP_DIR.resolve("app.log");
  }

  private static Path portFile() {
    return APP_DIR.resolve("running.port");
  }

  /**
   * One-time move for installs from before the DisputeCopilot -> Proofly rename. A plain rename
   * can be refused by Windows (a locked file inside, antivirus scanning it, etc.) — if so, this
   * keeps running out of the old folder rather than crashing or silently starting fresh with an
   * empty one next to the merchant's real data. The next launch tries the move again.
   */
  private static void migrateOldAppDir() {
    if (Files.exists(OLD_APP_DIR) && !Files.exists(NEW_APP_DIR)) {
      try {
        Files.move(OLD_APP_DIR, NEW_APP_DIR);
      } catch (IOException stillLocked) {
        APP_DIR = OLD_APP_DIR;
      }
    }
    System.setProperty("app.dir", APP_DIR.toString());
  }

  /**
   * Returns false if another Proofly is already running — in which case its page has
   * been opened in the browser and this process should just exit.
   */
  public static boolean claimSingleInstance() throws IOException {
    migrateOldAppDir();
    Files.createDirectories(APP_DIR);
    FileChannel channel = FileChannel.open(APP_DIR.resolve("instance.lock"), StandardOpenOption.CREATE, StandardOpenOption.WRITE);
    if (channel.tryLock() == null) {
      channel.close();
      openRunningInstance();
      return false;
    }
    instanceLock = channel;
    Files.deleteIfExists(portFile());
    return true;
  }

  /** Called once the server is up, so a second launch knows where to point the browser. */
  public static void recordRunningPort(String port) {
    try {
      Files.writeString(portFile(), port, StandardCharsets.UTF_8);
    } catch (IOException ignored) {
      // Only costs a second launch the "open the running copy" shortcut.
    }
  }

  /** Uses the usual ports when free, otherwise any free one, so another program on 8080 isn't fatal. */
  public static void choosePorts() {
    if (System.getProperty("server.port") == null && System.getenv("SERVER_PORT") == null) {
      System.setProperty("server.port", String.valueOf(freePort(8080)));
    }
    System.setProperty("app.embedded-postgres.port", String.valueOf(freePort(55432)));
  }

  static int freePort(int preferred) {
    InetAddress loopback = InetAddress.getLoopbackAddress();
    try (ServerSocket socket = new ServerSocket()) {
      socket.bind(new InetSocketAddress(loopback, preferred));
      return preferred;
    } catch (IOException taken) {
      try (ServerSocket socket = new ServerSocket(0, 0, loopback)) {
        return socket.getLocalPort();
      } catch (IOException e) {
        throw new IllegalStateException("No free local port available", e);
      }
    }
  }

  /** The other copy may still be starting up, so give it time to publish its port. */
  private static void openRunningInstance() {
    for (int i = 0; i < 120; i++) {
      try {
        if (Files.exists(portFile())) {
          BrowserLauncher.openBrowser("http://localhost:" + Files.readString(portFile(), StandardCharsets.UTF_8).strip());
          return;
        }
        Thread.sleep(500);
      } catch (Exception e) {
        break;
      }
    }
    showDialog("Proofly is already running.\n\nLook for its icon in the system tray (bottom-right of the screen), "
        + "or restart your computer if it seems stuck.", JOptionPane.INFORMATION_MESSAGE);
  }

  /**
   * Last stop for any startup failure in the desktop build: write it down (logging may not be
   * up yet) and tell the user in plain words, instead of silently vanishing.
   */
  public static void reportStartupFailure(Throwable failure) {
    try {
      Files.createDirectories(APP_DIR);
      StringWriter trace = new StringWriter();
      failure.printStackTrace(new PrintWriter(trace));
      Files.writeString(logFile(), Instant.now() + " Proofly failed to start:\n" + trace + "\n",
          StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
    } catch (IOException ignored) {
      // The dialog below still tells the user something went wrong.
    }
    showDialog("Proofly couldn't start.\n\nTry restarting your computer and opening it again. "
        + "If it keeps happening, send this file to support:\n" + logFile(), JOptionPane.ERROR_MESSAGE);
  }

  private static void showDialog(String message, int type) {
    try {
      JDialog dialog = new JOptionPane(message, type).createDialog("Proofly");
      dialog.setAlwaysOnTop(true); // no main window of ours to sit in front of
      dialog.setVisible(true);
      dialog.dispose();
    } catch (Exception ignored) {
      // Headless or no desktop — nothing more we can show.
    }
  }
}
