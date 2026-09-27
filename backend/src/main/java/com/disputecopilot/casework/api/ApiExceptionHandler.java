package com.disputecopilot.casework.api;

import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

  /**
   * Every missing-thing error used to come back as "Case not found", so "Save a model
   * configuration first." reached the user as a lie about a case. Use what the thrower said
   * when it said anything.
   */
  @ExceptionHandler(NoSuchElementException.class)
  public ResponseEntity<String> notFound(NoSuchElementException e) {
    String message = e.getMessage() == null || e.getMessage().isBlank() ? "Not found" : e.getMessage();
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(message);
  }

  @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
  public ResponseEntity<String> tooLarge() {
    return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE).body("That file is over the 10 MB limit for a policy document.");
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<String> badRequest(IllegalArgumentException e) {
    return ResponseEntity.badRequest().body(e.getMessage());
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<String> connectorFailure(IllegalStateException e) {
    return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(e.getMessage());
  }
}
