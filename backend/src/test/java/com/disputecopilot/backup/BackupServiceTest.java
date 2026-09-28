package com.disputecopilot.backup;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.disputecopilot.audit.AuditRecorder;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

/**
 * A restore that turns out not to be a real backup must never touch the database. An earlier
 * version truncated every table first and only then discovered the upload had nothing usable in
 * it — a garbage file returned 200 OK and silently wiped all data. These assert the fix by
 * checking dataSource.getConnection() is never called for input that isn't a genuine backup.
 */
class BackupServiceTest {

  @Test
  void rejectsANonZipFileWithoutTouchingTheDatabase() {
    DataSource dataSource = mock(DataSource.class);
    BackupService service = new BackupService(dataSource, mock(AuditRecorder.class));

    assertThrows(IllegalArgumentException.class,
        () -> service.restore(new ByteArrayInputStream("not a zip file at all".getBytes())));

    verifyNeverConnected(dataSource);
  }

  @Test
  void rejectsAZipWithNoRecognisedBackupContentWithoutTouchingTheDatabase() throws Exception {
    DataSource dataSource = mock(DataSource.class);
    BackupService service = new BackupService(dataSource, mock(AuditRecorder.class));

    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
      zip.putNextEntry(new ZipEntry("unrelated.txt"));
      zip.write("hello".getBytes());
      zip.closeEntry();
    }

    assertThrows(IllegalArgumentException.class,
        () -> service.restore(new ByteArrayInputStream(bytes.toByteArray())));

    verifyNeverConnected(dataSource);
  }

  private void verifyNeverConnected(DataSource dataSource) {
    try {
      verify(dataSource, never()).getConnection();
    } catch (java.sql.SQLException e) {
      throw new AssertionError(e);
    }
  }
}
