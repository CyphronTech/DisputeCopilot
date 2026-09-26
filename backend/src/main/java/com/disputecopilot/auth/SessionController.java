package com.disputecopilot.auth;

import com.disputecopilot.audit.AuditRecorder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
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
  private final HttpSessionSecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

  public SessionController(AuthenticationManager authenticationManager, AuditRecorder audit) {
    this.authenticationManager = authenticationManager;
    this.audit = audit;
  }

  public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
  public record SessionView(String email) {}

  @PostMapping
  public ResponseEntity<SessionView> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
    try {
      Authentication authentication = authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(request.email(), request.password()));
      SecurityContext context = SecurityContextHolder.createEmptyContext();
      context.setAuthentication(authentication);
      SecurityContextHolder.setContext(context);
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
