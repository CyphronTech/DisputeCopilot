package com.disputecopilot.setup;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.net.InetAddress;
import java.net.ServerSocket;
import org.junit.jupiter.api.Test;

class DesktopRuntimeTest {

  @Test
  void keepsThePreferredPortWhenFreeAndFallsBackWhenTaken() throws Exception {
    int port;
    try (ServerSocket probe = new ServerSocket(0, 0, InetAddress.getLoopbackAddress())) {
      port = probe.getLocalPort();
    }
    assertEquals(port, DesktopRuntime.freePort(port));

    try (ServerSocket squatter = new ServerSocket(port, 0, InetAddress.getLoopbackAddress())) {
      int fallback = DesktopRuntime.freePort(port);
      assertNotEquals(port, fallback);
      new ServerSocket(fallback, 0, InetAddress.getLoopbackAddress()).close(); // and it really is free
    }
  }
}
