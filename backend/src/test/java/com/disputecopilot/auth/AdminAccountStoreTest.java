package com.disputecopilot.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class AdminAccountStoreTest {

  @Test
  void passwordRules() {
    assertNotNull(AdminAccountStore.passwordProblem(null));
    assertNotNull(AdminAccountStore.passwordProblem("short7!"));
    assertNotNull(AdminAccountStore.passwordProblem("          "));
    assertNull(AdminAccountStore.passwordProblem("eight ch"));
  }

  @Test
  void emailsCompareCaseAndWhitespaceInsensitively() {
    assertEquals("owner@shop.com", AdminAccountStore.normaliseEmail("  Owner@Shop.COM "));
  }
}
