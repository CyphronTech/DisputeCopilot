package com.disputecopilot.casework.api;

import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(NoSuchElementException.class)
  public ResponseEntity<String> notFound() {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Case not found");
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<String> badRequest(IllegalArgumentException e) {
    return ResponseEntity.badRequest().body(e.getMessage());
  }
}
