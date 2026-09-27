package com.disputecopilot.auth;

import com.disputecopilot.audit.AuditRecorder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/session")
public class SessionController {

  private final AuthenticationManager authenticationManager;
  private final AuditRecorder audit;
  private final AdminAccountStore accounts;
  private final PasswordEncoder encoder;
  private final boolean passwordFromEnvironment;
  private final HttpSessionSecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

  public SessionController(AuthenticationManager authenticationManager, AuditRecorder audit, AdminAccountStore accounts,
      PasswordEncoder encoder, @Value("${app.admin.password:}") String envPassword) {
    this.authenticationManager = authenticationManager;
    this.audit = audit;
    this.accounts = accounts;
    this.encoder = encoder;
    this.passwordFromEnvironment = !envPassword.isBlank();
  }

  public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
  public record SessionView(String email) {}
  public record StatusView(boolean passwordSet) {}
  public record ChangePasswordRequest(String currentPassword, String newPassword) {}

  /** Public: tells the login page whether to show "Create your password" instead of sign-in. */
  @GetMapping("/status")
  public StatusView status() {
    return new StatusView(accounts.find() != null);
  }

  /** First run only — refuses once any login exists, so it can't be used to take over an install. */
  @PostMapping("/setup")
  public ResponseEntity<SessionView> setup(@RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
    String email = AdminAccountStore.normaliseEmail(request.email());
    if (email.isEmpty()) throw new IllegalArgumentException("Enter an email address.");
    requireAcceptable(request.password());
    if (!accounts.createIfAbsent(email, encoder.encode(request.password()))) {
      throw new IllegalArgumentException("A password has already been set for this app. Sign in instead.");
    }
    audit.record("Admin password set", "first-run login created", null, email, false, "lock", "neutral");
    return login(new LoginRequest(email, request.password()), httpRequest, httpResponse);
  }

  @PostMapping("/password")
  public ResponseEntity<Void> changePassword(@RequestBody ChangePasswordRequest request, Authentication authentication) {
    if (passwordFromEnvironment) {
      throw new IllegalArgumentException("This login is managed by the ADMIN_PASSWORD setting and can't be changed here.");
    }
    AdminAccountStore.Account account = accounts.find();
    if (account == null || request.currentPassword() == null || !encoder.matches(request.currentPassword(), account.passwordHash())) {
      // 400, not 401: the client treats 401 as "session expired" and bounces to the login page.
      throw new IllegalArgumentException("Current password is incorrect.");
    }
    requireAcceptable(request.newPassword());
    accounts.upsert(account.email(), encoder.encode(request.newPassword()));
    audit.record("Admin password changed", "password updated from Setup", null, authentication.getName(), false, "lock", "neutral");
    return ResponseEntity.noContent().build();
  }

  private static void requireAcceptable(String password) {
    String problem = AdminAccountStore.passwordProblem(password);
    if (problem != null) throw new IllegalArgumentException(problem);
  }

  @PostMapping
  public ResponseEntity<SessionView> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
    try {
      Authentication authentication = authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(request.email(), request.password()));
      SecurityContext context = SecurityContextHolder.createEmptyContext();
      context.setAuthentication(authentication);
      SecurityContextHolder.setContext(context);
      // New session id on sign-in, so an id obtained before login can't ride along after it.
      if (httpRequest.getSession(false) != null) httpRequest.changeSessionId();
      contextRepository.saveContext(context, httpRequest, httpResponse);
      audit.record("Login succeeded", "session started", null, authentication.getName(), false, "user", "neutral");
      return ResponseEntity.ok(new SessionView(authentication.getName()));
    } catch (BadCredentialsException e) {
      audit.record("Login failed", "bad credentials for " + request.email(), null, request.email(), false, "alert", "warn");
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
  }

  @GetMapping
  public ResponseEntity<SessionView> whoami(Authentication authentication) {
    if (authentication == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    return ResponseEntity.ok(new SessionView(authentication.getName()));
  }

  @DeleteMapping
  public ResponseEntity<Void> logout(HttpSession session) {
    session.invalidate();
    return ResponseEntity.noContent().build();
  }
}
