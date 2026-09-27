package com.disputecopilot.audit;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** A malformed login (missing/null email) used to write a null actor name, which then blew up
 *  the whole audit log page with a NullPointerException when it tried to compute initials. */
class AuditControllerTest {

  @Test
  void blankOrNullActorNameDoesNotBreakTheList() {
    AuditEventJpaRepository repository = mock(AuditEventJpaRepository.class);
    when(repository.findAllByOrderByOccurredAtDesc()).thenReturn(List.of(
        new AuditEventEntity(UUID.randomUUID(), "Login failed", "bad credentials", null, null, false, "alert", "warn", Instant.now()),
        new AuditEventEntity(UUID.randomUUID(), "Login failed", "bad credentials", null, "", false, "alert", "warn", Instant.now())));

    AuditController controller = new AuditController(repository);

    List<AuditController.AuditEventView> views = assertDoesNotThrow(controller::list);
    assertEquals("", views.get(0).actorInitials());
    assertEquals("", views.get(1).actorInitials());
  }
}
