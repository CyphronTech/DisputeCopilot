package com.disputecopilot.backup;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDate;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/setup/backup")
public class BackupController {

  private final BackupService backupService;

  public BackupController(BackupService backupService) {
    this.backupService = backupService;
  }

  @GetMapping
  public void download(HttpServletResponse response) throws IOException {
    response.setContentType("application/zip");
    response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
        "attachment; filename=\"disputecopilot-backup-" + LocalDate.now() + ".zip\"");
    backupService.backup(response.getOutputStream());
  }

  @PostMapping("/restore")
  public void restore(@RequestParam("file") MultipartFile file) throws IOException {
    if (file.isEmpty()) throw new IllegalArgumentException("No backup file was uploaded.");
    backupService.restore(file.getInputStream());
  }
}
