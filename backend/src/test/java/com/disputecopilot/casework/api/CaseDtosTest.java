package com.disputecopilot.casework.api;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.disputecopilot.casework.api.CaseDtos.CreateCaseRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

/** A pasted order ID longer than case_record.order_id's varchar(64) used to reach the database
 *  and fail as a raw, unhandled constraint violation instead of a message the merchant can act on. */
class CaseDtosTest {

  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  @Test
  void orderIdOver64CharsIsRejected() {
    String tooLong = "O".repeat(65);
    assertFalse(validator.validate(new CreateCaseRequest(tooLong)).isEmpty());
  }

  @Test
  void orderIdAt64CharsIsAccepted() {
    String atLimit = "O".repeat(64);
    assertTrue(validator.validate(new CreateCaseRequest(atLimit)).isEmpty());
  }

  @Test
  void blankOrderIdIsRejected() {
    assertFalse(validator.validate(new CreateCaseRequest("  ")).isEmpty());
  }
}
