package com.disputecopilot.auth;

import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.validation.Valid;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import org.junit.jupiter.api.Test;

/**
 * login() used to skip bean validation entirely (no @Valid), so a request with a missing/null
 * email reached the authentication manager, failed as expected, but then AuditRecorder.record
 * tried to save that null as actor_name into a NOT NULL column — turning a routine bad-login
 * attempt into an unhandled 500 instead of the intended 401.
 */
class SessionControllerTest {

  @Test
  void loginValidatesItsRequestBody() throws NoSuchMethodException {
    Method login = SessionController.class.getMethod("login", SessionController.LoginRequest.class,
        jakarta.servlet.http.HttpServletRequest.class, jakarta.servlet.http.HttpServletResponse.class);
    Parameter requestParam = login.getParameters()[0];
    boolean hasValid = false;
    for (Annotation a : requestParam.getAnnotations()) {
      if (a instanceof Valid) hasValid = true;
    }
    assertTrue(hasValid, "login()'s request body must be @Valid so a blank/null email or password is rejected before it reaches audit logging");
  }
}
