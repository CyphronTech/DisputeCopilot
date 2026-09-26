package com.disputecopilot.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

@Configuration
public class SecurityConfig {

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public UserDetailsService userDetailsService(
      @Value("${app.admin.email}") String adminEmail,
      @Value("${app.admin.password}") String adminPassword,
      PasswordEncoder encoder) {
    return new InMemoryUserDetailsManager(
        User.withUsername(adminEmail).password(encoder.encode(adminPassword)).roles("ADMIN").build());
  }

  @Bean
  public AuthenticationManager authenticationManager(UserDetailsService userDetailsService, PasswordEncoder encoder) {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
    provider.setPasswordEncoder(encoder);
    return provider::authenticate;
  }

  // ponytail: CSRF disabled — this is a single-tenant, self-hosted admin app behind the
  // operator's own network. Add CSRF tokens if it's ever exposed to a browser shared with
  // untrusted sites.
  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf.disable())
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.POST, "/api/v1/session").permitAll()
            .requestMatchers("/actuator/**").permitAll()
            .requestMatchers("/api/**").authenticated()
            // Everything else is the SPA shell (index.html, JS/CSS, and every client-side
            // route it forwards to) — only meaningful once the frontend is bundled into the
            // jar (see SpaFallbackController); in dev, Vite serves these directly and Spring
            // never sees these requests. The shell itself has no data; it's the /api/**
            // calls above that stay behind auth.
            .anyRequest().permitAll())
        .httpBasic(basic -> basic.disable())
        .formLogin(form -> form.disable())
        .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
    return http.build();
  }
}
